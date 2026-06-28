#!/usr/bin/env bash
set -euo pipefail

cd /srv/opensyria/datasets-api

docker compose ps
curl -fsS "http://127.0.0.1:${API_PROXY_PORT:-3000}/health/live"
echo
curl -fsS "http://127.0.0.1:${API_PROXY_PORT:-3000}/health/ready"
echo
