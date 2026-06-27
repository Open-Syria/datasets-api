# OpenSyria Datasets API

Read-only NestJS API for OpenSyria datasets.

This repository is intentionally a standalone app. It is not a monorepo.

## Setup

```bash
corepack enable pnpm
pnpm install
```

## Development

```bash
pnpm run start:dev
```

The app uses `PORT` when set, otherwise it listens on `3000`.

## Scripts

```bash
pnpm run check
pnpm run check:fix
pnpm run format
pnpm run format:check
pnpm run build
pnpm run lint
pnpm run lint:fix
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run audit:prod
pnpm run validate
```

## Tooling

- Biome handles formatting, import organization, and fast checks.
- ESLint handles stricter type-aware TypeScript linting.
- lint-staged runs checks on staged files before commit.
- Husky installs the Git hooks.
- commitlint enforces Conventional Commits.
- pnpm 11 is used for dependency installation and lockfile management.

## Supply Chain Policy

Dependency policy lives in `pnpm-workspace.yaml`.

- The lockfile must be committed.
- New package versions must satisfy the configured minimum release age.
- Transitive dependencies from exotic sources are blocked.
- Dependency build scripts are blocked unless explicitly reviewed in `allowBuilds`.
- Production dependency advisories are checked with `pnpm run audit:prod`.

If pnpm reports a blocked dependency build script, review why the package needs it before adding it to `allowBuilds`.

Commit messages should use Conventional Commits:

```text
feat: add dataset endpoint
fix: correct import path
docs: update setup guide
chore: update tooling
```

## License

MIT
