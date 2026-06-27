# Contributing

Thanks for your interest in OpenSyria Datasets API.

This repository contains the public read-only API for released OpenSyria datasets. The code is public for transparency, auditability, and reuse, but the API implementation is maintainer-led.

Broad public contribution is intended for the dataset repositories, not this API repository.

## Contribution Scope

Accepted here:

- security reports through the private security policy,
- bug reports with reproducible API behavior,
- documentation corrections,
- maintainer-authored implementation work,
- dependency update pull requests opened by configured automation.

Not accepted here as unsolicited pull requests:

- new API features,
- new endpoint designs,
- subscription, website, or admin features,
- schema changes,
- dataset source changes,
- broad refactors.

Dataset corrections and missing data should go to the relevant dataset repository once it exists.

## Local Setup

```bash
corepack enable pnpm
pnpm install
pnpm run start:dev
```

## Before Opening a Pull Request

Open a pull request only when it is maintainer-authored, requested by the maintainer, a documentation correction, or an automated dependency update.

Run:

```bash
pnpm run validate
```

This runs formatting checks, linting, type checking, unit tests, e2e tests, build, and production dependency audit.

## Commit Messages

Use Conventional Commits:

```text
feat: add governorate filters
fix: handle missing release manifest
docs: update deployment notes
chore: update dependencies
```

## API Standards

Follow [`docs/api-standards.md`](docs/api-standards.md) for:

- route naming,
- controller and method names,
- OpenAPI tags and summaries,
- response envelopes,
- DTO naming,
- Zod schema usage.

## Dataset Source Rules

This API consumes versioned release artifacts. It should not scrape or read live data repositories at runtime.

Dataset contribution rules live in [`docs/dataset-contribution-policy.md`](docs/dataset-contribution-policy.md) and should be copied into each dataset repository when those repositories are created.

When changing dataset contracts or examples:

- keep public IDs stable,
- include source attribution fields,
- avoid personal, private, sensitive, military, or surveillance-related data,
- use only data that can be legally redistributed,
- do not treat AI output as a source.

## Pull Request Expectations

- Make sure the change belongs in this API repository.
- Keep changes focused.
- Update docs when behavior, routes, config, or deployment steps change.
- Add or update tests for behavior changes.
- Do not commit secrets or local `.env` files.
- Do not add production dependencies without a clear reason.
