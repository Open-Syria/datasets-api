#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_SERVICES_ROOT="/opt/syr/services/staging"
DOCKER_WRAPPER="${SERVER_SERVICES_ROOT}/bin/docker"
BACKUP_DIR="/opt/syr/backups/production/opensyria/postgres"
DATABASE_NAME="opensyria_datasets_production"
LOCK_FILE="${ROOT_DIR}/.backup.lock"
TEMP_DUMP=""
TEMP_CHECKSUM=""
TEMP_RECOVERY=""

umask 077

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

docker_cmd() {
  "${DOCKER_WRAPPER}" "$@"
}

cleanup() {
  for file in "${TEMP_DUMP}" "${TEMP_CHECKSUM}" "${TEMP_RECOVERY}"; do
    case "${file}" in
      "${BACKUP_DIR}"/.opensyria-production-*.partial)
        rm -f -- "${file}"
        ;;
    esac
  done
}

trap cleanup EXIT

main() {
  command -v flock >/dev/null 2>&1 || fail "flock is required"
  command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required"
  [[ -f "${DOCKER_WRAPPER}" && -x "${DOCKER_WRAPPER}" && ! -L "${DOCKER_WRAPPER}" ]] \
    || fail "Shared Docker wrapper is missing or unsafe: ${DOCKER_WRAPPER}"

  [[ -d "${ROOT_DIR}" && ! -L "${ROOT_DIR}" ]] \
    || fail "Production application root must be a real directory"
  [[ -d "${BACKUP_DIR}" && ! -L "${BACKUP_DIR}" ]] \
    || fail "OpenSyria backup directory is missing or unsafe: ${BACKUP_DIR}"
  [[ "$(realpath -e "${BACKUP_DIR}")" == "${BACKUP_DIR}" ]] \
    || fail "OpenSyria backup directory does not resolve to its exact production path"
  [[ ! -L "${LOCK_FILE}" ]] || fail "Backup lock must not be a symbolic link"
  exec 9>"${LOCK_FILE}"
  chmod 600 "${LOCK_FILE}"
  flock -n 9 || fail "Another OpenSyria database backup is running"

  local timestamp basename final_dump final_checksum final_recovery digest
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  basename="opensyria-production-${timestamp}"
  final_dump="${BACKUP_DIR}/${basename}.dump"
  final_checksum="${final_dump}.sha256"
  final_recovery="${BACKUP_DIR}/${basename}.recovery"
  TEMP_DUMP="${BACKUP_DIR}/.${basename}.dump.partial"
  TEMP_CHECKSUM="${BACKUP_DIR}/.${basename}.dump.sha256.partial"
  TEMP_RECOVERY="${BACKUP_DIR}/.${basename}.recovery.partial"

  [[ ! -e "${final_dump}" && ! -L "${final_dump}" \
    && ! -e "${final_checksum}" && ! -L "${final_checksum}" \
    && ! -e "${final_recovery}" && ! -L "${final_recovery}" ]] \
    || fail "Backup timestamp collision: ${timestamp}"

  docker_cmd dump-opensyria-database > "${TEMP_DUMP}"
  [[ -s "${TEMP_DUMP}" ]] || fail "PostgreSQL produced an empty backup"

  docker_cmd validate-postgres-dump < "${TEMP_DUMP}" >/dev/null
  digest="$(sha256sum "${TEMP_DUMP}" | cut -d ' ' -f 1)"
  [[ "${digest}" =~ ^[0-9a-f]{64}$ ]] || fail "Could not calculate backup checksum"
  printf '%s  %s\n' "${digest}" "$(basename "${final_dump}")" > "${TEMP_CHECKSUM}"
  {
    printf 'database=%s\n' "${DATABASE_NAME}"
    printf 'created_at=%s\n' "${timestamp}"
    printf 'dump=%s\n' "$(basename "${final_dump}")"
    printf 'checksum=%s\n' "$(basename "${final_checksum}")"
    printf 'restore_helper=%s\n' "${ROOT_DIR}/bin/restore-postgres.sh"
  } > "${TEMP_RECOVERY}"
  chmod 600 "${TEMP_DUMP}" "${TEMP_CHECKSUM}" "${TEMP_RECOVERY}"

  mv -f "${TEMP_DUMP}" "${final_dump}"
  TEMP_DUMP=""
  mv -f "${TEMP_CHECKSUM}" "${final_checksum}"
  TEMP_CHECKSUM=""
  mv -f "${TEMP_RECOVERY}" "${final_recovery}"
  TEMP_RECOVERY=""

  echo "Validated OpenSyria PostgreSQL backup: ${final_dump}"
}

main "$@"
