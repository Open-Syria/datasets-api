#!/usr/bin/env bash
set -euo pipefail

expected_release="${1:?Usage: $0 <expected-application-release>}"
server_services_root="/opt/syr/services/staging"
docker_wrapper="${server_services_root}/bin/docker"

response="$(
  "${docker_wrapper}" exec infra-nginx \
    wget -qO- \
      --header='Host: api.opensyria.org' \
      http://127.0.0.1/health/ready
)"

EXPECTED_RELEASE="${expected_release}" RESPONSE="${response}" python3 <<'PY'
import json
import os

payload = json.loads(os.environ["RESPONSE"])
data = payload.get("data", {})
app = data.get("app", {})
database = data.get("database", {})

if payload.get("success") is not True:
    raise SystemExit("API readiness response was not successful")
if app.get("release") != os.environ["EXPECTED_RELEASE"]:
    raise SystemExit("infra-nginx is not routing to the expected API release")
if database.get("status") != "up" or not database.get("release"):
    raise SystemExit("the pinned production read model is not ready")
if int(database.get("recordCount", 0)) <= 0:
    raise SystemExit("the pinned production read model is empty")
PY

printf 'OpenSyria API %s is ready through infra-nginx\n' "${expected_release}"
