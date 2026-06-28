#!/usr/bin/env bash
set -euo pipefail

runtime_image="${1:-}"
migrations_image="${2:-}"

if [ -z "$runtime_image" ]; then
  echo "Usage: $0 <runtime-image> <migrations-image>" >&2
  exit 2
fi

if [ -z "$migrations_image" ]; then
  echo "A migrations image is required so database migrations run before traffic flips." >&2
  exit 2
fi

cd /srv/opensyria/datasets-api

if [ ! -f .env ]; then
  echo "Missing /srv/opensyria/datasets-api/.env" >&2
  exit 1
fi

mkdir -p state nginx postgres
ghcr_logged_in=0

cleanup() {
  if [ "$ghcr_logged_in" -eq 1 ]; then
    docker logout ghcr.io >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

set_env_var() {
  key="$1"
  value="$2"
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { written = 0 }
    $0 ~ "^" key "=" { print key "=" value; written = 1; next }
    { print }
    END { if (!written) print key "=" value }
  ' .env > "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" .env
}

write_upstream() {
  slot="$1"
  printf 'set $%s http://api-%s:3000;\n' opensyria_api_upstream "$slot" > state/nginx-upstream.conf
}

wait_for_service_health() {
  service="$1"
  timeout_seconds="${2:-180}"
  started_at="$(date +%s)"

  while true; do
    container_id="$(docker compose ps -q "$service")"

    if [ -n "$container_id" ]; then
      health="$(docker inspect "$container_id" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')"
      if [ "$health" = "healthy" ] || [ "$health" = "running" ]; then
        return 0
      fi
    fi

    now="$(date +%s)"
    if [ $((now - started_at)) -ge "$timeout_seconds" ]; then
      echo "Timed out waiting for $service to become healthy." >&2
      docker compose ps "$service" >&2 || true
      docker compose logs --tail=80 "$service" >&2 || true
      return 1
    fi

    sleep 5
  done
}

wait_for_readiness() {
  service="$1"
  timeout_seconds="${2:-180}"
  started_at="$(date +%s)"

  while true; do
    if docker compose exec -T "$service" node -e "require('node:http').get('http://127.0.0.1:3000/health/ready', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"; then
      return 0
    fi

    now="$(date +%s)"
    if [ $((now - started_at)) -ge "$timeout_seconds" ]; then
      echo "Timed out waiting for $service readiness." >&2
      docker compose logs --tail=120 "$service" >&2 || true
      return 1
    fi

    sleep 5
  done
}

current_slot="$(cat state/active-slot 2>/dev/null || true)"
case "$current_slot" in
  blue) target_slot="green" ;;
  green) target_slot="blue" ;;
  *) target_slot="blue"; current_slot="" ;;
esac

target_key="$(printf '%s' "$target_slot" | tr '[:lower:]' '[:upper:]')"
set_env_var "API_${target_key}_IMAGE" "$runtime_image"
set_env_var "MIGRATIONS_IMAGE" "$migrations_image"

write_upstream "${current_slot:-$target_slot}"

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
  ghcr_logged_in=1
fi

docker compose config --quiet

if ! docker image inspect opensyria/postgis:16-bookworm >/dev/null 2>&1; then
  docker compose build postgres
fi

docker compose up -d postgres redis proxy
wait_for_service_health postgres 180
wait_for_service_health redis 120

docker pull "$migrations_image"
docker pull "$runtime_image"

docker compose --profile ops run --rm migrate
docker compose run --rm --no-deps "api-$target_slot" pnpm run datasets:sync:prod
docker compose run --rm "api-$target_slot" pnpm run read-model:import:geography:prod

docker compose up -d --no-deps "api-$target_slot"
wait_for_service_health "api-$target_slot" 180
wait_for_readiness "api-$target_slot" 180

write_upstream "$target_slot"
docker compose exec -T proxy nginx -s reload
printf '%s\n' "$target_slot" > state/active-slot

if [ -n "$current_slot" ] && [ "$current_slot" != "$target_slot" ]; then
  sleep "${DRAIN_SECONDS:-10}"
  docker compose stop "api-$current_slot"
fi

docker compose ps
