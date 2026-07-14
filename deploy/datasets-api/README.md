# OpenSyria Datasets API Runtime

This directory is copied to `/srv/opensyria/datasets-api` on `opensyria-prod`.

- `compose.yaml` runs PostgreSQL/PostGIS, Redis, a local nginx proxy, and blue/green API slots.
- `.env` is private on the server and is written by the GitHub production deployment from environment variables and secrets.
- The proxy binds to `127.0.0.1:3000`; public ingress should come through Cloudflare Tunnel.
- Postgres and Redis are internal Docker services and are not published to the host.
- Local scheduled backups are disabled for now; future backups should target S3/off-host storage.

Deployment:

```bash
cd /srv/opensyria/datasets-api
bin/deploy-blue-green.sh ghcr.io/open-syria/datasets-api:<tag> ghcr.io/open-syria/datasets-api:<tag>-migrations
```

The deploy script runs migrations, syncs/imports the release sources pinned in
the runtime image's `dataset-releases.json`, smoke-checks artifact-backed
transport and telecom endpoints, starts the inactive API slot, checks readiness,
reloads nginx to the new slot, and stops the old slot after a short drain.
