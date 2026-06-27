# Contributing

Thanks for helping improve OpenSyria Datasets API.

This repository contains the public read-only API for released OpenSyria datasets. Dataset source records live in separate data repositories.

## Local Setup

```bash
corepack enable pnpm
pnpm install
pnpm run start:dev
```

## Before Opening a Pull Request

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

When changing dataset contracts or examples:

- keep public IDs stable,
- include source attribution fields,
- avoid personal, private, sensitive, military, or surveillance-related data,
- use only data that can be legally redistributed,
- do not treat AI output as a source.

## Pull Request Expectations

- Keep changes focused.
- Update docs when behavior, routes, config, or deployment steps change.
- Add or update tests for behavior changes.
- Do not commit secrets or local `.env` files.
- Do not add production dependencies without a clear reason.

