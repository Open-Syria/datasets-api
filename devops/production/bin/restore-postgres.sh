#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_SERVICES_ROOT="/opt/syr/services/staging"
DOCKER_WRAPPER="${SERVER_SERVICES_ROOT}/bin/docker"
RUNTIME_ENV_FILE="${ROOT_DIR}/env/api.env"
MIGRATE_ENV_FILE="${ROOT_DIR}/env/migrate.env"
BACKUP_DIR="/opt/syr/backups/production/opensyria/postgres"
POSTGRES_CONTAINER="infra-postgres"
POSTGRES_IMAGE="postgis/postgis:17-3.5-alpine@sha256:2db2d29dbde9379103076851c39f50f4fd9c7ee4297251ed006ed94d586df958"
DATA_NETWORK="opensyria-production-data"
DATABASE_NAME="opensyria_datasets_production"
CONFIRMATION="RESTORE_OPEN_SYRIA_PRODUCTION"
DEPLOY_LOCK_FILE="${ROOT_DIR}/.deploy.lock"
BACKUP_LOCK_FILE="${ROOT_DIR}/.backup.lock"
PENDING_FILE="${ROOT_DIR}/state/pending.env"

umask 077

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

docker_cmd() {
  "${DOCKER_WRAPPER}" "$@"
}

main() {
  local requested_dump="${1:-}"
  local confirmation="${2:-}"
  [[ -n "${requested_dump}" && "${confirmation}" == "${CONFIRMATION}" ]] \
    || fail "Usage: $0 <backup.dump> ${CONFIRMATION}"
  [[ -f "${DOCKER_WRAPPER}" && -x "${DOCKER_WRAPPER}" && ! -L "${DOCKER_WRAPPER}" ]] \
    || fail "Shared Docker wrapper is missing or unsafe: ${DOCKER_WRAPPER}"
  command -v flock >/dev/null 2>&1 || fail "flock is required"
  [[ -d "${ROOT_DIR}" && ! -L "${ROOT_DIR}" ]] \
    || fail "Production application root must be a real directory"
  [[ ! -L "${DEPLOY_LOCK_FILE}" && ! -L "${BACKUP_LOCK_FILE}" ]] \
    || fail "Production lock files must not be symbolic links"
  exec 9>"${DEPLOY_LOCK_FILE}"
  chmod 600 "${DEPLOY_LOCK_FILE}"
  flock -n 9 || fail "An OpenSyria API deployment is in progress"
  exec 8>"${BACKUP_LOCK_FILE}"
  chmod 600 "${BACKUP_LOCK_FILE}"
  flock -n 8 || fail "An OpenSyria database backup is in progress"
  [[ ! -e "${PENDING_FILE}" && ! -L "${PENDING_FILE}" ]] \
    || fail "Finalize or roll back the pending API rollout before restoring"

  [[ -f "${RUNTIME_ENV_FILE}" && ! -L "${RUNTIME_ENV_FILE}" ]] \
    || fail "Production runtime environment is missing or unsafe"
  [[ "$(stat -c '%a' "${RUNTIME_ENV_FILE}")" == "600" ]] \
    || fail "Production runtime environment must have mode 0600"
  python3 "${ROOT_DIR}/bin/validate-runtime-env.py" \
    "${RUNTIME_ENV_FILE}" \
    --write-operation-envs "${ROOT_DIR}/env"
  [[ -f "${MIGRATE_ENV_FILE}" && ! -L "${MIGRATE_ENV_FILE}" ]] \
    || fail "Minimal database environment is missing or unsafe"
  [[ "$(stat -c '%a' "${MIGRATE_ENV_FILE}")" == "600" ]] \
    || fail "Minimal database environment must have mode 0600"

  local backup_root dump_file checksum_file recovery_file postgres_image
  local expected_digest expected_name unexpected_checksum_field actual_digest
  local role_state cross_database_state login_state database_state postgis_version
  [[ -d "${BACKUP_DIR}" && ! -L "${BACKUP_DIR}" ]] \
    || fail "OpenSyria backup root is missing or unsafe"
  [[ "$(realpath -e "${BACKUP_DIR}")" == "${BACKUP_DIR}" ]] \
    || fail "OpenSyria backup root must resolve to its exact production path"
  backup_root="$(realpath -e "${BACKUP_DIR}")"
  [[ -f "${requested_dump}" && ! -L "${requested_dump}" ]] \
    || fail "Backup must be a regular, non-symbolic-link file"
  dump_file="$(realpath -e "${requested_dump}")"
  case "${dump_file}" in
    "${backup_root}"/opensyria-production-*.dump) ;;
    *) fail "Restore is restricted to OpenSyria production backups in ${backup_root}" ;;
  esac
  [[ -f "${dump_file}" && ! -L "${dump_file}" ]] \
    || fail "Backup must be a regular, non-symbolic-link file"
  [[ "$(stat -c '%a' "${dump_file}")" == "600" ]] \
    || fail "Backup must have mode 0600"

  checksum_file="${dump_file}.sha256"
  [[ -f "${checksum_file}" && ! -L "${checksum_file}" ]] \
    || fail "Backup checksum sidecar is missing or unsafe"
  [[ "$(stat -c '%a' "${checksum_file}")" == "600" ]] \
    || fail "Backup checksum sidecar must have mode 0600"
  IFS=' ' read -r expected_digest expected_name unexpected_checksum_field \
    < "${checksum_file}"
  [[ "${expected_digest}" =~ ^[0-9a-f]{64}$ \
    && "${expected_name}" == "$(basename "${dump_file}")" \
    && -z "${unexpected_checksum_field}" ]] \
    || fail "Backup checksum sidecar does not contain exactly the selected dump"
  [[ "$(wc -l < "${checksum_file}")" == "1" ]] \
    || fail "Backup checksum sidecar must contain exactly one record"
  actual_digest="$(sha256sum "${dump_file}" | cut -d ' ' -f 1)"
  [[ "${actual_digest}" == "${expected_digest}" ]] \
    || fail "Backup checksum verification failed"
  recovery_file="${dump_file%.dump}.recovery"
  [[ -f "${recovery_file}" && ! -L "${recovery_file}" ]] \
    || fail "Backup recovery metadata is missing or unsafe"
  [[ "$(stat -c '%a' "${recovery_file}")" == "600" ]] \
    || fail "Backup recovery metadata must have mode 0600"
  grep -Fxq "database=${DATABASE_NAME}" "${recovery_file}" \
    || fail "Backup recovery metadata targets a different database"
  grep -Fxq "dump=$(basename "${dump_file}")" "${recovery_file}" \
    || fail "Backup recovery metadata does not match the selected dump"
  grep -Fxq "checksum=$(basename "${checksum_file}")" "${recovery_file}" \
    || fail "Backup recovery metadata does not match the selected checksum"
  docker_cmd exec -i "${POSTGRES_CONTAINER}" pg_restore --list < "${dump_file}" >/dev/null

  if docker_cmd ps --format '{{.Names}}' \
    | grep -Eq '^opensyria-production-api-(blue|green)$'; then
    fail "Stop both OpenSyria API slots before restoring the production database"
  fi

  postgres_image="$(docker_cmd inspect "${POSTGRES_CONTAINER}" --format '{{.Config.Image}}')"
  [[ "${postgres_image}" == "${POSTGRES_IMAGE}" ]] \
    || fail "Shared PostgreSQL is not running the exact approved PostGIS image"
  docker_cmd network inspect "${DATA_NETWORK}" >/dev/null

  role_state="$(
    docker_cmd exec "${POSTGRES_CONTAINER}" sh -ceu '
      exec psql --username="$POSTGRES_USER" --dbname=postgres \
        --tuples-only --no-align \
        --command="SELECT r.rolcanlogin, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls, NOT EXISTS (SELECT 1 FROM pg_auth_members AS membership WHERE membership.member = r.oid) FROM pg_roles AS r WHERE r.rolname = '\''opensyria_datasets_production'\'';"
    '
  )"
  [[ "${role_state}" == "t|f|f|f|f|f|t" ]] \
    || fail "The OpenSyria database role is missing, privileged, or inherits another role"

  cross_database_state="$(
    docker_cmd exec "${POSTGRES_CONTAINER}" sh -ceu '
      exec psql --username="$POSTGRES_USER" --dbname=postgres \
        --tuples-only --no-align \
        --command="SELECT has_database_privilege('\''opensyria_datasets_production'\'', '\''jobara_staging'\'', '\''CONNECT'\''), has_database_privilege('\''opensyria_datasets_production'\'', '\''infisical'\'', '\''CONNECT'\'');"
    '
  )"
  [[ "${cross_database_state}" == "f|f" ]] \
    || fail "The OpenSyria database role can connect to Jobara or Infisical"

  login_state="$(
    docker_cmd run --rm \
      --network "${DATA_NETWORK}" \
      --env-file "${MIGRATE_ENV_FILE}" \
      --user postgres \
      --read-only \
      --cap-drop ALL \
      --security-opt no-new-privileges:true \
      --pids-limit 64 \
      --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777 \
      --entrypoint sh \
      "${postgres_image}" \
      -ceu 'libpq_url="${DATABASE_URL%\?schema=public}"; exec psql --dbname="$libpq_url" --tuples-only --no-align --command="SELECT current_user, current_database();"'
  )"
  [[ "${login_state}" == "opensyria_datasets_production|opensyria_datasets_production" ]] \
    || fail "Validated Infisical database credential cannot authenticate to the current OpenSyria database"

  echo "Resetting only ${DATABASE_NAME} before restoring $(basename "${dump_file}")"
  docker_cmd exec -i "${POSTGRES_CONTAINER}" sh -ceu '
    exec psql --set=ON_ERROR_STOP=1 --username="$POSTGRES_USER" --dbname=postgres
  ' <<'SQL'
DROP DATABASE IF EXISTS opensyria_datasets_production WITH (FORCE);
CREATE DATABASE opensyria_datasets_production
  WITH OWNER opensyria_datasets_production
       TEMPLATE template0
       ENCODING 'UTF8';
REVOKE ALL PRIVILEGES
  ON DATABASE opensyria_datasets_production FROM PUBLIC;
SQL

  docker_cmd exec -i "${POSTGRES_CONTAINER}" sh -ceu '
    exec psql --set=ON_ERROR_STOP=1 --username="$POSTGRES_USER" \
      --dbname=opensyria_datasets_production
  ' <<'SQL'
CREATE EXTENSION postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public
  TO opensyria_datasets_production;
SQL

  docker_cmd run --rm -i \
    --network "${DATA_NETWORK}" \
    --env-file "${MIGRATE_ENV_FILE}" \
    --user postgres \
    --read-only \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --pids-limit 64 \
    --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777 \
    --entrypoint sh \
    "${postgres_image}" \
    -ceu 'libpq_url="${DATABASE_URL%\?schema=public}"; exec pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname="$libpq_url"' \
    < "${dump_file}"
  database_state="$(
    docker_cmd exec "${POSTGRES_CONTAINER}" sh -ceu '
      exec psql --username="$POSTGRES_USER" --dbname=postgres \
        --tuples-only --no-align \
        --command="SELECT pg_get_userbyid(d.datdba), NOT EXISTS (SELECT 1 FROM aclexplode(COALESCE(d.datacl, acldefault('\''d'\'', d.datdba))) AS acl WHERE acl.grantee = 0 AND acl.privilege_type = '\''CONNECT'\'') FROM pg_database AS d WHERE d.datname = '\''opensyria_datasets_production'\'';"
    '
  )"
  [[ "${database_state}" == "opensyria_datasets_production|t" ]] \
    || fail "Restored database ownership or PUBLIC isolation is invalid"
  postgis_version="$(
    docker_cmd exec "${POSTGRES_CONTAINER}" sh -ceu '
      exec psql --username="$POSTGRES_USER" \
        --dbname=opensyria_datasets_production --tuples-only --no-align \
        --command="SELECT extversion FROM pg_extension WHERE extname = '\''postgis'\'';"
    '
  )"
  [[ "${postgis_version}" =~ ^[0-9]+\.[0-9]+ ]] \
    || fail "PostGIS was not restored to the OpenSyria database"
  echo "Exact OpenSyria production database restore completed; start and verify one API slot manually."
}

main "$@"
