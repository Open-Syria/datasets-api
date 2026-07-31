# OpenSyria datasets API production bundle

GitHub Actions copies this directory to:

```text
/opt/syr/apps/opensyria/production/datasets-api
```

The bundle contains only application Compose and blue/green operations. Shared
nginx, PostgreSQL/PostGIS, the dedicated OpenSyria Redis, Infisical, monitoring,
and Cloudflare Tunnel are owned by the host-platform repository.

One-time host requirements:

- install the reviewed fixed-path sudoers rule;
- provision `opensyria_datasets_production`, its non-superuser owner, and
  PostGIS in the existing PostgreSQL cluster;
- create the Infisical `opensyria` project, `production` environment, and
  read-only `/datasets-api` Universal Auth identity;
- copy `.infisical.env.example` to `.infisical.env`, fill it, and set mode
  `0600`;
- create the backup directory documented in `docs/deployment.md`.

Normal deployment is invoked by the production workflow. For operator recovery:

```bash
cd /opt/syr/apps/opensyria/production/datasets-api
bin/check.sh <full-git-sha>
bin/deploy.sh status
bin/deploy.sh rollback
bin/deploy.sh finalize
```

The workflow drives `prepare`, `switch`, and `finalize` as separate locked
phases. `prepare` requires an immutable GHCR `@sha256:` reference and a full
commit SHA. Do not run server-side builds or write runtime secrets into
`.deploy.env`; runtime configuration is exported from Infisical.

Every pre-migration backup is validated with `pg_restore --list` and receives
checksum and recovery sidecars. Destructive recovery is deliberately separate:

```bash
bin/restore-postgres.sh \
  /opt/syr/backups/production/opensyria/postgres/<backup>.dump \
  RESTORE_OPEN_SYRIA_PRODUCTION
```

The helper refuses to run while a deployment/backup or either API slot is
active, validates the Infisical database target and restricted role, and can
restore only an OpenSyria production backup with all sidecars present. After
explicit confirmation it resets only `opensyria_datasets_production`, restores
its isolation and PostGIS extension, then restores the archive as the
application role. This removes post-backup objects instead of leaving them
behind beside older Prisma migration history.
