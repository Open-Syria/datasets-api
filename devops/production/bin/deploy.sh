#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_SERVICES_ROOT="/opt/syr/services/staging"
DOCKER_WRAPPER="${SERVER_SERVICES_ROOT}/bin/docker"
INFISICAL_LOGIN_HELPER="${SERVER_SERVICES_ROOT}/bin/infisical-login"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.app.yml"
COMPOSE_ENV_FILE="${ROOT_DIR}/.deploy.env"
RUNTIME_ENV_FILE="${ROOT_DIR}/env/api.env"
INFISICAL_CONFIG_FILE="${ROOT_DIR}/.infisical.env"
STATE_DIR="${ROOT_DIR}/state"
ACTIVE_SLOT_FILE="${STATE_DIR}/active-slot"
ACTIVE_RELEASE_FILE="${STATE_DIR}/active-release"
PENDING_FILE="${STATE_DIR}/pending.env"
PREVIOUS_UPSTREAM_FILE="${STATE_DIR}/previous-upstream.conf"
DEPLOY_LOCK_FILE="${ROOT_DIR}/.deploy.lock"
NGINX_DEPLOY_LOCK_FILE="${SERVER_SERVICES_ROOT}/.nginx-deploy.lock"
NGINX_ACTIVE_INCLUDE="${SERVER_SERVICES_ROOT}/infrastructure/nginx/conf.d/includes/opensyria-production-api-active.conf"
NGINX_CONTAINER="infra-nginx"
POSTGRES_CONTAINER="infra-postgres"
REDIS_CONTAINER="opensyria-production-redis"
EDGE_NETWORK="syr-staging-edge"
DATA_NETWORK="opensyria-production-data"
PUBLIC_HOST="api.opensyria.org"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-240}"
DRAIN_SECONDS="${DRAIN_SECONDS:-30}"
NGINX_LOCK_TIMEOUT_SECONDS="${NGINX_LOCK_TIMEOUT_SECONDS:-300}"
NGINX_ROUTE_TIMEOUT_SECONDS="${NGINX_ROUTE_TIMEOUT_SECONDS:-15}"
DOCKER_CONFIG_DIR=""
RUNTIME_ENV_TEMP_FILE=""
PREPARE_CLEANUP_SERVICE=""
PHASE=""
CURRENT_SLOT=""
TARGET_SLOT=""
HAS_ROLLBACK=""
DEPLOYMENT_RELEASE=""
PREVIOUS_RELEASE=""

umask 077

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

require_private_regular_file() {
  local file="$1"
  [[ -f "${file}" && ! -L "${file}" ]] \
    || fail "${file} must be a regular, non-symbolic-link file"
  [[ "$(stat -c '%a' "${file}")" == "600" ]] \
    || fail "${file} must have mode 0600"
}

ensure_private_directory() {
  local directory="$1"
  local mode="$2"

  if [[ -e "${directory}" || -L "${directory}" ]]; then
    [[ -d "${directory}" && ! -L "${directory}" ]] \
      || fail "${directory} must be a real directory"
  else
    install -d -m "${mode}" "${directory}"
  fi
  chmod "${mode}" "${directory}"
}

require_slot() {
  [[ "$1" == "blue" || "$1" == "green" ]] \
    || fail "Invalid deployment slot: $1"
}

other_slot() {
  if [[ "$1" == "blue" ]]; then
    printf 'green\n'
  else
    printf 'blue\n'
  fi
}

service_for_slot() {
  require_slot "$1"
  printf 'api-%s\n' "$1"
}

docker_cmd() {
  "${DOCKER_WRAPPER}" "$@"
}

compose() {
  require_private_regular_file "${COMPOSE_ENV_FILE}"
  require_private_regular_file "${RUNTIME_ENV_FILE}"
  docker_cmd compose \
    --project-directory "${ROOT_DIR}" \
    --env-file "${COMPOSE_ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    "$@"
}

read_env_value() {
  local file="$1"
  local key="$2"

  [[ -f "${file}" ]] || return 0
  sed -n "s/^${key}=//p" "${file}" | tail -n 1
}

write_atomic_value() {
  local file="$1"
  local mode="$2"
  local value="$3"
  local temporary

  temporary="$(mktemp "${file}.XXXXXX")"
  printf '%s\n' "${value}" > "${temporary}"
  chmod "${mode}" "${temporary}"
  mv -f "${temporary}" "${file}"
}

current_upstream_slot() {
  [[ -f "${NGINX_ACTIVE_INCLUDE}" && ! -L "${NGINX_ACTIVE_INCLUDE}" ]] \
    || fail "Shared nginx include is missing or unsafe: ${NGINX_ACTIVE_INCLUDE}"

  local slot expected
  slot="$({
    # The nginx variable below is literal text.
    # shellcheck disable=SC2016
    sed -n \
      's/^set \$opensyria_api_upstream "opensyria-production-api-\(blue\|green\):3000";$/\1/p' \
      "${NGINX_ACTIVE_INCLUDE}"
  })"
  require_slot "${slot}"
  expected="set \$opensyria_api_upstream \"opensyria-production-api-${slot}:3000\";"
  cmp -s <(printf '%s\n' "${expected}") "${NGINX_ACTIVE_INCLUDE}" \
    || fail "Shared nginx include does not match the production API contract"
  printf '%s\n' "${slot}"
}

write_nginx_upstream() {
  local slot="$1"
  local temporary

  require_slot "${slot}"
  temporary="$(mktemp "${NGINX_ACTIVE_INCLUDE}.XXXXXX")"
  # The nginx variable below is literal text.
  # shellcheck disable=SC2016
  printf 'set $opensyria_api_upstream "opensyria-production-api-%s:3000";\n' \
    "${slot}" > "${temporary}"
  chmod 644 "${temporary}"
  mv -f "${temporary}" "${NGINX_ACTIVE_INCLUDE}"
}

restore_previous_upstream() {
  [[ -f "${PREVIOUS_UPSTREAM_FILE}" && ! -L "${PREVIOUS_UPSTREAM_FILE}" ]] \
    || fail "Previous nginx upstream backup is missing or unsafe"

  local temporary
  temporary="$(mktemp "${NGINX_ACTIVE_INCLUDE}.XXXXXX")"
  cp "${PREVIOUS_UPSTREAM_FILE}" "${temporary}"
  chmod 644 "${temporary}"
  mv -f "${temporary}" "${NGINX_ACTIVE_INCLUDE}"
}

reload_nginx() {
  if ! docker_cmd ps --format '{{.Names}}' | grep -Fxq "${NGINX_CONTAINER}"; then
    echo "${NGINX_CONTAINER} is not running" >&2
    return 1
  fi
  docker_cmd exec "${NGINX_CONTAINER}" nginx -t \
    && docker_cmd exec "${NGINX_CONTAINER}" nginx -s reload
}

service_container_id() {
  compose ps -q "$(service_for_slot "$1")"
}

service_is_healthy() {
  local slot="$1"
  local container_id health

  container_id="$(service_container_id "${slot}")"
  [[ -n "${container_id}" ]] || return 1
  health="$(
    docker_cmd inspect "${container_id}" \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}'
  )"
  [[ "${health}" == "healthy" ]]
}

wait_for_service_health() {
  local slot="$1"
  local service started_at now

  service="$(service_for_slot "${slot}")"
  started_at="$(date +%s)"
  while ! service_is_healthy "${slot}"; do
    now="$(date +%s)"
    if ((now - started_at >= HEALTH_TIMEOUT_SECONDS)); then
      compose ps "${service}" >&2 || true
      compose logs --tail=150 "${service}" >&2 || true
      fail "Timed out waiting for ${service} to become healthy"
    fi
    sleep 3
  done
}

verify_direct_release() {
  local slot="$1"
  local expected_release="$2"
  local service

  service="$(service_for_slot "${slot}")"
  compose exec -T -e EXPECTED_RELEASE="${expected_release}" "${service}" node - <<'NODE'
fetch('http://127.0.0.1:3000/health/ready')
  .then(async (response) => {
    const payload = await response.json()
    const data = payload.data ?? {}
    if (!response.ok || payload.success !== true) throw new Error('readiness failed')
    if (data.app?.release !== process.env.EXPECTED_RELEASE) {
      throw new Error('application release mismatch')
    }
    if (data.database?.status !== 'up' || !data.database?.release) {
      throw new Error('pinned read model is unavailable')
    }
    if (!(data.database?.recordCount > 0)) throw new Error('pinned read model is empty')
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
NODE
}

verify_private_route() {
  local expected_release="$1"
  local output started_at now

  started_at="$(date +%s)"
  while true; do
    if output="$("${ROOT_DIR}/bin/check.sh" "${expected_release}" 2>&1)"; then
      printf '%s\n' "${output}"
      return 0
    fi

    now="$(date +%s)"
    if ((now - started_at >= NGINX_ROUTE_TIMEOUT_SECONDS)); then
      printf '%s\n' "${output}" >&2
      echo "Private ${PUBLIC_HOST} route did not stabilize on ${expected_release} within ${NGINX_ROUTE_TIMEOUT_SECONDS}s" >&2
      return 1
    fi
    sleep 1
  done
}

verify_private_route_without_release() {
  docker_cmd exec "${NGINX_CONTAINER}" \
    wget -q --spider \
      --header="Host: ${PUBLIC_HOST}" \
      http://127.0.0.1/health/ready
}

verify_previous_private_route() {
  if [[ -n "${PREVIOUS_RELEASE}" ]]; then
    verify_private_route "${PREVIOUS_RELEASE}"
  else
    verify_private_route_without_release
  fi
}

restore_previous_route() {
  restore_previous_upstream
  if reload_nginx && verify_previous_private_route; then
    return 0
  fi

  echo "Previous API route could not be verified; restoring the healthy candidate." >&2
  write_nginx_upstream "${TARGET_SLOT}"
  if reload_nginx && verify_private_route "${DEPLOYMENT_RELEASE}"; then
    echo "Restored and verified the candidate API route." >&2
  else
    echo "Candidate remains running, but automatic route recovery could not be verified." >&2
  fi
  return 1
}

sync_runtime_env_from_infisical() {
  require_command infisical
  require_command python3
  require_private_regular_file "${INFISICAL_CONFIG_FILE}"
  [[ -f "${INFISICAL_LOGIN_HELPER}" && -x "${INFISICAL_LOGIN_HELPER}" && ! -L "${INFISICAL_LOGIN_HELPER}" ]] \
    || fail "Shared Infisical login helper is missing or unsafe: ${INFISICAL_LOGIN_HELPER}"

  local INFISICAL_API_URL=""
  local INFISICAL_CLIENT_ID=""
  local INFISICAL_CLIENT_SECRET=""
  local INFISICAL_PROJECT_ID=""
  local INFISICAL_ENV_SLUG=""
  local INFISICAL_SECRET_PATH=""
  local line key value
  local seen_api_url="false"
  local seen_client_id="false"
  local seen_client_secret="false"
  local seen_project_id="false"
  local seen_env_slug="false"
  local seen_secret_path="false"

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    [[ "${line}" =~ ^[[:space:]]*$ || "${line}" =~ ^[[:space:]]*# ]] \
      && continue
    [[ "${line}" =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]] \
      || fail "Invalid line in ${INFISICAL_CONFIG_FILE}"
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    case "${key}" in
      INFISICAL_API_URL)
        [[ "${seen_api_url}" == "false" ]] || fail "Duplicate ${key}"
        seen_api_url="true"
        INFISICAL_API_URL="${value}"
        ;;
      INFISICAL_CLIENT_ID)
        [[ "${seen_client_id}" == "false" ]] || fail "Duplicate ${key}"
        seen_client_id="true"
        INFISICAL_CLIENT_ID="${value}"
        ;;
      INFISICAL_CLIENT_SECRET)
        [[ "${seen_client_secret}" == "false" ]] || fail "Duplicate ${key}"
        seen_client_secret="true"
        INFISICAL_CLIENT_SECRET="${value}"
        ;;
      INFISICAL_PROJECT_ID)
        [[ "${seen_project_id}" == "false" ]] || fail "Duplicate ${key}"
        seen_project_id="true"
        INFISICAL_PROJECT_ID="${value}"
        ;;
      INFISICAL_ENV_SLUG)
        [[ "${seen_env_slug}" == "false" ]] || fail "Duplicate ${key}"
        seen_env_slug="true"
        INFISICAL_ENV_SLUG="${value}"
        ;;
      INFISICAL_SECRET_PATH)
        [[ "${seen_secret_path}" == "false" ]] || fail "Duplicate ${key}"
        seen_secret_path="true"
        INFISICAL_SECRET_PATH="${value}"
        ;;
      *)
        fail "Unexpected key ${key} in ${INFISICAL_CONFIG_FILE}"
        ;;
    esac
  done < "${INFISICAL_CONFIG_FILE}"

  : "${INFISICAL_CLIENT_ID:?INFISICAL_CLIENT_ID is required}"
  : "${INFISICAL_CLIENT_SECRET:?INFISICAL_CLIENT_SECRET is required}"
  [[ "${INFISICAL_CLIENT_ID}" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] \
    || fail "INFISICAL_CLIENT_ID must be a UUID"
  [[ "${INFISICAL_CLIENT_SECRET}" =~ ^[^[:space:]]+$ ]] \
    || fail "INFISICAL_CLIENT_SECRET must be a single non-empty value"
  [[ "${INFISICAL_API_URL}" == "http://127.0.0.1:14001" ]] \
    || fail "INFISICAL_API_URL must use the protected raw loopback endpoint"
  [[ "${INFISICAL_PROJECT_ID}" == "5922e0e7-9672-4195-a61f-90db3eb60ce5" ]] \
    || fail "INFISICAL_PROJECT_ID must be the immutable OpenSyria production project ID"
  [[ "${INFISICAL_ENV_SLUG}" == "production" ]] \
    || fail "INFISICAL_ENV_SLUG must be production"
  [[ "${INFISICAL_SECRET_PATH}" == "/datasets-api" ]] \
    || fail "INFISICAL_SECRET_PATH must be /datasets-api"

  local infisical_token
  infisical_token="$(
    INFISICAL_API_URL="${INFISICAL_API_URL}" \
    INFISICAL_LOGIN_CLIENT_ID="${INFISICAL_CLIENT_ID}" \
    INFISICAL_LOGIN_CLIENT_SECRET="${INFISICAL_CLIENT_SECRET}" \
      "${INFISICAL_LOGIN_HELPER}"
  )"
  [[ -n "${infisical_token}" ]] \
    || fail "Infisical Universal Auth returned an empty token"

  ensure_private_directory "${ROOT_DIR}/env" 700
  RUNTIME_ENV_TEMP_FILE="$(mktemp "${ROOT_DIR}/env/.api.env.XXXXXX")"
  INFISICAL_API_URL="${INFISICAL_API_URL}" \
    INFISICAL_TOKEN="${infisical_token}" \
      infisical export \
        --projectId="${INFISICAL_PROJECT_ID}" \
        --env="${INFISICAL_ENV_SLUG}" \
        --path="${INFISICAL_SECRET_PATH}" \
        --format=dotenv \
        --output-file="${RUNTIME_ENV_TEMP_FILE}" \
        --silent
  unset infisical_token INFISICAL_CLIENT_SECRET
  [[ -s "${RUNTIME_ENV_TEMP_FILE}" ]] \
    || fail "Infisical export produced an empty runtime environment"
  python3 "${ROOT_DIR}/bin/validate-runtime-env.py" \
    "${RUNTIME_ENV_TEMP_FILE}" \
    --write-operation-envs "${ROOT_DIR}/env"
  chmod 600 "${RUNTIME_ENV_TEMP_FILE}"
  mv -f "${RUNTIME_ENV_TEMP_FILE}" "${RUNTIME_ENV_FILE}"
  RUNTIME_ENV_TEMP_FILE=""
}

validate_saved_slot_values() {
  local image="$1"
  local release="$2"

  [[ "${image}" =~ ^ghcr\.io/open-syria/datasets-api@sha256:[0-9a-f]{64}$ ]] \
    || fail "Saved slot image is not the immutable OpenSyria datasets API image"
  [[ "${release}" =~ ^[0-9a-f]{40}$ ]] \
    || fail "Saved slot release is not a full commit SHA"
}

write_compose_env() {
  local target_slot="$1"
  local image="$2"
  local release="$3"
  local blue_image green_image blue_release green_release temporary

  blue_image="$(read_env_value "${COMPOSE_ENV_FILE}" API_BLUE_IMAGE)"
  green_image="$(read_env_value "${COMPOSE_ENV_FILE}" API_GREEN_IMAGE)"
  blue_release="$(read_env_value "${COMPOSE_ENV_FILE}" API_BLUE_RELEASE)"
  green_release="$(read_env_value "${COMPOSE_ENV_FILE}" API_GREEN_RELEASE)"

  if [[ -n "${blue_image}" || -n "${blue_release}" ]]; then
    validate_saved_slot_values "${blue_image}" "${blue_release}"
  fi
  if [[ -n "${green_image}" || -n "${green_release}" ]]; then
    validate_saved_slot_values "${green_image}" "${green_release}"
  fi

  blue_image="${blue_image:-${image}}"
  green_image="${green_image:-${image}}"
  blue_release="${blue_release:-${release}}"
  green_release="${green_release:-${release}}"
  if [[ "${target_slot}" == "blue" ]]; then
    blue_image="${image}"
    blue_release="${release}"
  else
    green_image="${image}"
    green_release="${release}"
  fi

  temporary="$(mktemp "${COMPOSE_ENV_FILE}.XXXXXX")"
  {
    printf 'DEPLOYMENT_VERSION=%s\n' "${release}"
    printf 'OPERATIONS_IMAGE=%s\n' "${image}"
    printf 'API_BLUE_IMAGE=%s\n' "${blue_image}"
    printf 'API_BLUE_RELEASE=%s\n' "${blue_release}"
    printf 'API_GREEN_IMAGE=%s\n' "${green_image}"
    printf 'API_GREEN_RELEASE=%s\n' "${green_release}"
  } > "${temporary}"
  chmod 600 "${temporary}"
  mv -f "${temporary}" "${COMPOSE_ENV_FILE}"
}

write_pending_state() {
  local phase="$1"
  local temporary

  temporary="$(mktemp "${PENDING_FILE}.XXXXXX")"
  {
    printf 'PHASE=%s\n' "${phase}"
    printf 'CURRENT_SLOT=%s\n' "${CURRENT_SLOT}"
    printf 'TARGET_SLOT=%s\n' "${TARGET_SLOT}"
    printf 'HAS_ROLLBACK=%s\n' "${HAS_ROLLBACK}"
    printf 'DEPLOYMENT_RELEASE=%s\n' "${DEPLOYMENT_RELEASE}"
    printf 'PREVIOUS_RELEASE=%s\n' "${PREVIOUS_RELEASE}"
  } > "${temporary}"
  chmod 600 "${temporary}"
  mv -f "${temporary}" "${PENDING_FILE}"
}

load_pending_state() {
  require_private_regular_file "${PENDING_FILE}"
  # shellcheck disable=SC1090
  source "${PENDING_FILE}"

  [[ "${PHASE}" == "prepared" || "${PHASE}" == "switching" || "${PHASE}" == "switched" ]] \
    || fail "Invalid pending phase: ${PHASE}"
  if [[ -n "${CURRENT_SLOT}" ]]; then
    require_slot "${CURRENT_SLOT}"
  fi
  require_slot "${TARGET_SLOT}"
  [[ "${HAS_ROLLBACK}" == "true" || "${HAS_ROLLBACK}" == "false" ]] \
    || fail "Invalid rollback state"
  [[ "${DEPLOYMENT_RELEASE}" =~ ^[0-9a-f]{40}$ ]] \
    || fail "Invalid pending deployment release"
  if [[ "${HAS_ROLLBACK}" == "true" ]]; then
    [[ -n "${CURRENT_SLOT}" ]] || fail "Rollback state is missing its current slot"
    [[ "${PREVIOUS_RELEASE}" =~ ^[0-9a-f]{40}$ ]] \
      || fail "Invalid previous deployment release"
  fi
}

clear_pending_state() {
  rm -f "${PENDING_FILE}" "${PREVIOUS_UPSTREAM_FILE}"
}

record_active_state() {
  local slot="$1"
  local release="$2"

  write_atomic_value "${ACTIVE_SLOT_FILE}" 600 "${slot}"
  write_atomic_value "${ACTIVE_RELEASE_FILE}" 600 "${release}"
}

login_registry() {
  local username="$1"
  local token="$2"

  DOCKER_CONFIG_DIR="$(mktemp -d "${ROOT_DIR}/.docker-config.XXXXXX")"
  export DOCKER_CONFIG="${DOCKER_CONFIG_DIR}"
  printf '%s' "${token}" | docker_cmd login ghcr.io --username "${username}" --password-stdin
}

run_release_operations() {
  local datasets_token="$1"

  "${ROOT_DIR}/bin/backup-postgres.sh"
  compose run --rm migrate
  if [[ -n "${datasets_token}" ]]; then
    GITHUB_TOKEN="${datasets_token}" compose run --rm -e GITHUB_TOKEN \
      -e REDIS_ENABLED=false -e REDIS_REQUIRED=false \
      sync node dist/cli/sync-dataset-releases.js
  else
    compose run --rm -e REDIS_ENABLED=false -e REDIS_REQUIRED=false \
      sync node dist/cli/sync-dataset-releases.js
  fi
  compose run --rm -e DATABASE_ENABLED=false -e DATABASE_REQUIRED=false \
    -e REDIS_ENABLED=false -e REDIS_REQUIRED=false \
    sync node dist/cli/smoke-dataset-releases.js
  compose run --rm import node dist/cli/import-geography-read-model.js
}

prepare_release() {
  local image="${1:-}"
  local release="${2:-}"
  local registry_username="${3:-}"
  local registry_token datasets_token routed_slot routed_release target_service

  [[ "${image}" =~ ^ghcr\.io/open-syria/datasets-api@sha256:[0-9a-f]{64}$ ]] \
    || fail "The deployment image must be the immutable OpenSyria datasets API digest"
  [[ "${release}" =~ ^[0-9a-f]{40}$ ]] \
    || fail "The deployment release must be a full 40-character commit SHA"
  [[ "${registry_username}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] \
    || fail "Registry username is invalid"
  [[ ! -e "${PENDING_FILE}" ]] \
    || fail "A pending rollout already exists; finalize or roll it back first"
  IFS= read -r registry_token || fail "Registry token must be supplied on standard input"
  IFS= read -r datasets_token || datasets_token=""
  [[ -n "${registry_token}" ]] || fail "Registry token is empty"

  sync_runtime_env_from_infisical
  ensure_private_directory "${ROOT_DIR}/data" 700
  ensure_private_directory "${ROOT_DIR}/data/releases" 700
  docker_cmd network inspect "${EDGE_NETWORK}" >/dev/null \
    || fail "External Docker network ${EDGE_NETWORK} is missing"
  docker_cmd network inspect "${DATA_NETWORK}" >/dev/null \
    || fail "External Docker network ${DATA_NETWORK} is missing"
  docker_cmd inspect "${POSTGRES_CONTAINER}" >/dev/null \
    || fail "Shared PostgreSQL container is missing"
  docker_cmd inspect "${REDIS_CONTAINER}" >/dev/null \
    || fail "Dedicated OpenSyria Redis container is missing"

  routed_slot="$(current_upstream_slot)"
  CURRENT_SLOT=""
  HAS_ROLLBACK="false"
  PREVIOUS_RELEASE=""
  TARGET_SLOT="$(other_slot "${routed_slot}")"

  if [[ -f "${COMPOSE_ENV_FILE}" ]] && service_is_healthy "${routed_slot}"; then
    routed_release="$(read_env_value "${COMPOSE_ENV_FILE}" "API_${routed_slot^^}_RELEASE")"
    if [[ "${routed_release}" =~ ^[0-9a-f]{40}$ ]] \
      && verify_direct_release "${routed_slot}" "${routed_release}" \
      && verify_private_route "${routed_release}"; then
      CURRENT_SLOT="${routed_slot}"
      HAS_ROLLBACK="true"
      PREVIOUS_RELEASE="${routed_release}"
    fi
  fi

  DEPLOYMENT_RELEASE="${release}"
  install -m 600 "${NGINX_ACTIVE_INCLUDE}" "${PREVIOUS_UPSTREAM_FILE}"
  write_compose_env "${TARGET_SLOT}" "${image}" "${release}"
  compose config --quiet

  login_registry "${registry_username}" "${registry_token}"
  registry_token=""
  docker_cmd pull "${image}"
  docker_cmd logout ghcr.io >/dev/null 2>&1 || true
  run_release_operations "${datasets_token}"
  datasets_token=""

  target_service="$(service_for_slot "${TARGET_SLOT}")"
  PREPARE_CLEANUP_SERVICE="${target_service}"
  compose up -d --no-deps --force-recreate "${target_service}"
  wait_for_service_health "${TARGET_SLOT}"
  verify_direct_release "${TARGET_SLOT}" "${release}"

  write_pending_state prepared
  PREPARE_CLEANUP_SERVICE=""
  docker_cmd image prune -f --filter 'until=168h' >/dev/null || true
  echo "Prepared ${TARGET_SLOT} API release ${release}; shared nginx still routes ${routed_slot}."
}

switch_release() {
  load_pending_state
  [[ "${PHASE}" == "prepared" ]] || fail "Pending rollout is already switched"

  wait_for_service_health "${TARGET_SLOT}"
  verify_direct_release "${TARGET_SLOT}" "${DEPLOYMENT_RELEASE}"
  cmp -s "${NGINX_ACTIVE_INCLUDE}" "${PREVIOUS_UPSTREAM_FILE}" \
    || fail "Shared nginx upstream changed after prepare; refusing to overwrite it"

  write_pending_state switching
  write_nginx_upstream "${TARGET_SLOT}"
  write_pending_state switched
  if ! reload_nginx || ! verify_private_route "${DEPLOYMENT_RELEASE}"; then
    echo "API cutover verification failed." >&2
    if [[ "${HAS_ROLLBACK}" == "true" ]] && restore_previous_route; then
      write_pending_state prepared
      echo "Restored and verified the previous production API route." >&2
    else
      echo "Could not restore a verified prior route; leaving the candidate running." >&2
    fi
    return 1
  fi

  echo "Switched private ${PUBLIC_HOST} routing to ${TARGET_SLOT}; ${CURRENT_SLOT:-no prior slot} remains available."
}

finalize_release() {
  load_pending_state
  [[ "${PHASE}" == "switched" ]] || fail "The pending rollout has not been switched"
  [[ "$(current_upstream_slot)" == "${TARGET_SLOT}" ]] \
    || fail "Shared nginx is no longer routed to ${TARGET_SLOT}"

  wait_for_service_health "${TARGET_SLOT}"
  verify_direct_release "${TARGET_SLOT}" "${DEPLOYMENT_RELEASE}"
  verify_private_route "${DEPLOYMENT_RELEASE}"
  sleep "${DRAIN_SECONDS}"
  wait_for_service_health "${TARGET_SLOT}"
  verify_direct_release "${TARGET_SLOT}" "${DEPLOYMENT_RELEASE}"
  verify_private_route "${DEPLOYMENT_RELEASE}"

  if [[ "${HAS_ROLLBACK}" == "true" && "${CURRENT_SLOT}" != "${TARGET_SLOT}" ]]; then
    compose stop "$(service_for_slot "${CURRENT_SLOT}")"
  fi
  record_active_state "${TARGET_SLOT}" "${DEPLOYMENT_RELEASE}"
  clear_pending_state
  echo "Finalized production API release ${DEPLOYMENT_RELEASE} on ${TARGET_SLOT}."
}

rollback_release() {
  load_pending_state

  local routed_slot target_service current_service
  routed_slot="$(current_upstream_slot)"
  target_service="$(service_for_slot "${TARGET_SLOT}")"

  if [[ "${PHASE}" == "prepared" || ("${PHASE}" == "switching" && "${routed_slot}" != "${TARGET_SLOT}") ]]; then
    if [[ "${routed_slot}" == "${TARGET_SLOT}" ]]; then
      fail "Shared nginx now routes the candidate; refusing to stop it without a verified restore"
    fi
    cmp -s "${NGINX_ACTIVE_INCLUDE}" "${PREVIOUS_UPSTREAM_FILE}" \
      || fail "Shared nginx changed during the prepared rollout; leaving the candidate running"
    [[ "${HAS_ROLLBACK}" == "true" ]] \
      || fail "No verified prior API slot exists; leaving the healthy candidate running"
    verify_previous_private_route \
      || fail "The previous API route is not healthy; leaving the candidate running"
    compose stop "${target_service}" >/dev/null 2>&1 || true
    clear_pending_state
    echo "Cancelled prepared ${TARGET_SLOT} rollout; shared nginx was never changed."
    return 0
  fi

  if [[ "${HAS_ROLLBACK}" != "true" || -z "${CURRENT_SLOT}" ]]; then
    fail "No previously healthy production slot exists; leaving ${TARGET_SLOT} routed for manual recovery"
  fi

  current_service="$(service_for_slot "${CURRENT_SLOT}")"
  compose up -d --no-deps "${current_service}"
  wait_for_service_health "${CURRENT_SLOT}"
  verify_direct_release "${CURRENT_SLOT}" "${PREVIOUS_RELEASE}"

  if [[ "${routed_slot}" == "${TARGET_SLOT}" ]]; then
    restore_previous_route \
      || fail "Could not restore the previous API route; the candidate was kept running"
  elif cmp -s "${NGINX_ACTIVE_INCLUDE}" "${PREVIOUS_UPSTREAM_FILE}"; then
    reload_nginx
    if ! verify_previous_private_route; then
      write_nginx_upstream "${TARGET_SLOT}"
      reload_nginx || true
      verify_private_route "${DEPLOYMENT_RELEASE}" || true
      fail "Could not verify the previous API route; the candidate was kept running"
    fi
  else
    fail "Shared nginx drifted away from both rollout routes; refusing automatic rollback"
  fi
  compose stop "${target_service}" >/dev/null 2>&1 || true
  record_active_state "${CURRENT_SLOT}" "${PREVIOUS_RELEASE}"
  clear_pending_state
  echo "Rolled production API routing back to ${CURRENT_SLOT}."
}

show_status() {
  echo "Shared nginx slot: $(current_upstream_slot)"
  if [[ -f "${ACTIVE_SLOT_FILE}" ]]; then
    echo "Recorded active slot: $(cat "${ACTIVE_SLOT_FILE}")"
  else
    echo "Recorded active slot: none"
  fi
  if [[ -f "${ACTIVE_RELEASE_FILE}" ]]; then
    echo "Recorded active release: $(cat "${ACTIVE_RELEASE_FILE}")"
  else
    echo "Recorded active release: none"
  fi
  if [[ -f "${PENDING_FILE}" ]]; then
    echo "Pending rollout: yes"
  else
    echo "Pending rollout: no"
  fi
  if [[ -f "${COMPOSE_ENV_FILE}" && -f "${RUNTIME_ENV_FILE}" ]]; then
    compose ps
  fi
}

cleanup() {
  if [[ -n "${PREPARE_CLEANUP_SERVICE}" && ! -f "${PENDING_FILE}" ]]; then
    local cleanup_slot routed_slot
    cleanup_slot="${PREPARE_CLEANUP_SERVICE#api-}"
    if routed_slot="$(current_upstream_slot 2>/dev/null)" \
      && [[ "${routed_slot}" != "${cleanup_slot}" ]]; then
      compose stop "${PREPARE_CLEANUP_SERVICE}" >/dev/null 2>&1 || true
    else
      echo "Leaving ${PREPARE_CLEANUP_SERVICE} running because shared routing is uncertain." >&2
    fi
  fi

  case "${RUNTIME_ENV_TEMP_FILE}" in
    "${ROOT_DIR}"/env/.api.env.*)
      rm -f "${RUNTIME_ENV_TEMP_FILE}"
      ;;
  esac
  case "${DOCKER_CONFIG_DIR}" in
    "${ROOT_DIR}"/.docker-config.*)
      rm -rf "${DOCKER_CONFIG_DIR}"
      ;;
  esac
}

main() {
  require_command flock
  [[ "${NGINX_LOCK_TIMEOUT_SECONDS}" =~ ^[1-9][0-9]{0,3}$ ]] \
    || fail "NGINX_LOCK_TIMEOUT_SECONDS must be between 1 and 9999"
  [[ "${NGINX_ROUTE_TIMEOUT_SECONDS}" =~ ^[1-9][0-9]{0,3}$ ]] \
    || fail "NGINX_ROUTE_TIMEOUT_SECONDS must be between 1 and 9999"
  [[ -f "${DOCKER_WRAPPER}" && -x "${DOCKER_WRAPPER}" && ! -L "${DOCKER_WRAPPER}" ]] \
    || fail "Shared Docker wrapper is missing or unsafe: ${DOCKER_WRAPPER}"
  [[ -d "${ROOT_DIR}" && ! -L "${ROOT_DIR}" ]] \
    || fail "Production application root must be a real directory"
  ensure_private_directory "${STATE_DIR}" 700
  [[ ! -L "${DEPLOY_LOCK_FILE}" ]] || fail "Deployment lock must not be a symbolic link"
  [[ -f "${ROOT_DIR}/bin/check.sh" && -x "${ROOT_DIR}/bin/check.sh" ]] \
    || fail "Private production check helper is missing"
  [[ -f "${ROOT_DIR}/bin/backup-postgres.sh" && -x "${ROOT_DIR}/bin/backup-postgres.sh" ]] \
    || fail "OpenSyria backup helper is missing"
  exec 9>"${DEPLOY_LOCK_FILE}"
  chmod 600 "${DEPLOY_LOCK_FILE}"
  flock -n 9 || fail "Another API deployment holds ${DEPLOY_LOCK_FILE}"

  if [[ -e "${NGINX_DEPLOY_LOCK_FILE}" || -L "${NGINX_DEPLOY_LOCK_FILE}" ]]; then
    [[ -f "${NGINX_DEPLOY_LOCK_FILE}" && ! -L "${NGINX_DEPLOY_LOCK_FILE}" ]] \
      || fail "Shared nginx deployment lock must be a regular, non-symbolic-link file"
  fi
  exec 8>"${NGINX_DEPLOY_LOCK_FILE}"
  chmod 600 "${NGINX_DEPLOY_LOCK_FILE}"
  require_private_regular_file "${NGINX_DEPLOY_LOCK_FILE}"
  flock -w "${NGINX_LOCK_TIMEOUT_SECONDS}" 8 \
    || fail "Timed out waiting for the shared nginx lock ${NGINX_DEPLOY_LOCK_FILE}"

  case "${1:-}" in
    prepare)
      shift
      prepare_release "$@"
      ;;
    switch)
      switch_release
      ;;
    finalize)
      finalize_release
      ;;
    rollback)
      rollback_release
      ;;
    status)
      show_status
      ;;
    *)
      fail "Usage: $0 {prepare <image@sha256:digest> <git-sha> <registry-username>|switch|finalize|rollback|status}"
      ;;
  esac
}

trap cleanup EXIT
main "$@"
