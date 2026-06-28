# Contributing

Thanks for your interest in OpenSyria Datasets API.

This repository contains the public read-only API for released OpenSyria datasets. The code is public for transparency, auditability, and reuse, but API implementation is maintainer-led.

Broad public contribution is intended for the dataset repositories, not this API repository.

## Table of Contents

- [What Belongs Here](#what-belongs-here)
- [Before Opening an Issue](#before-opening-an-issue)
- [Local Setup](#local-setup)
- [Pull Requests](#pull-requests)
- [Validation](#validation)
- [API Standards](#api-standards)
- [Dataset Source Rules](#dataset-source-rules)
- [Commit Messages](#commit-messages)

## What Belongs Here

Accepted in this repository:

- reproducible API bug reports
- documentation corrections
- deployment, CI, tooling, or dependency maintenance
- maintainer-authored implementation work
- maintainer-requested changes
- automated dependency update pull requests
- private security reports through the security policy

Not accepted here as unsolicited pull requests:

- new API features
- new endpoint designs
- subscription, website, admin, billing, or auth features
- dataset source changes
- dataset schema changes without maintainer approval
- broad refactors unrelated to a tracked issue

Dataset corrections and missing records should go to the relevant dataset repository.

## Before Opening an Issue

Use the GitHub issue forms:

- **API Bug Report** for reproducible API behavior.
- **Documentation Correction** for stale commands, broken links, or unclear docs.
- **Deployment or Operations Issue** for Docker, CI, Redis, database, sync, or import problems.
- **Maintainer Proposal** for ideas that need maintainer review before implementation.

Do not include secrets, tokens, private URLs, personal data, or restricted data in public issues.

Security vulnerabilities should be reported privately through [SECURITY.md](SECURITY.md).

Project conduct expectations are documented in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Local Setup

```bash
corepack enable pnpm
pnpm install
pnpm run db:generate
pnpm run start:dev
```

For local PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
pnpm run db:migrate
```

## Pull Requests

Open a pull request only when it is maintainer-authored, requested by a maintainer, a documentation correction, a reproducible bug fix, a tooling/deployment fix, or an automated dependency update.

Follow [docs/pull-request-workflow.md](docs/pull-request-workflow.md) for branch names, commit messages, review expectations, merge guidance, and release-note expectations.

Before opening a PR:

- make sure the change belongs in `datasets-api`,
- keep the change focused,
- update docs when behavior, routes, config, commands, or deployment steps change,
- add or update tests for behavior changes,
- do not commit secrets or local `.env` files,
- do not commit generated local artifacts,
- avoid new production dependencies unless clearly necessary.

## Validation

Run the full validation before implementation PRs:

```bash
pnpm run validate
```

For documentation-only changes, run:

```bash
pnpm run check
```

When Prisma models, migrations, or read-model imports change, also run:

```bash
docker compose up -d postgres redis
pnpm run test:integration:db
```

## API Standards

Follow [docs/api-standards.md](docs/api-standards.md) for:

- route naming,
- controller and method names,
- OpenAPI tags, summaries, and descriptions,
- response envelopes,
- response helpers,
- DTO naming,
- Zod schema usage,
- pagination conventions,
- error response conventions.

## Dataset Source Rules

This API consumes versioned release artifacts. It should not scrape, import from, or read live dataset repository branches at runtime.

Dataset contribution rules live in [docs/dataset-contribution-policy.md](docs/dataset-contribution-policy.md) and should be copied or adapted into each dataset repository.

When API changes touch dataset contracts:

- keep public IDs stable,
- preserve source attribution fields,
- avoid personal, private, sensitive, military, or surveillance-related data,
- use only data that can be legally redistributed,
- do not treat AI output as a source,
- document migration and import impact.

## Commit Messages

Use Conventional Commits:

```text
feat: add governorate filters
fix: handle missing release manifest
docs: update deployment notes
chore: update dependencies
```
