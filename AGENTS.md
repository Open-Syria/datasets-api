# Agent Notes

This repository contains the read-only OpenSyria datasets API built with NestJS, Fastify, Prisma, and pnpm.

Work inside this repository only. Keep application code in `src`, Prisma assets in `prisma`, public data/configuration in their existing folders, and generated code in generated directories. Do not commit `.env`, database credentials, local generated scratch files, or private infrastructure details.

Use Node 24+ and pnpm 11+. Before handing off changes, run the smallest relevant command and prefer `pnpm validate` when changing API behavior, Prisma integration, generated clients, or shared modules:

- `pnpm check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`
- `pnpm validate`

## Public Documentation

Public docs may describe application behavior, public URLs, local setup, and
reusable hosting requirements. Keep live host inventories, private addresses,
deployment paths, provider resource IDs, access policies, credential sharing,
relationships with unrelated projects, and backup/recovery records in private
operator documentation outside public repositories. Use localhost, reserved
example domains, or placeholders in examples. Documentation freshness rules
below apply only to information suitable for public release.

## Documentation Freshness

- Treat this `AGENTS.md` as living agent documentation. When adding, removing, or renaming a repo-local skill under `.agents/skills`, update the `Local Skills` list in this file in the same change.
- When adding, removing, renaming, or changing public controllers, DTOs, response envelopes, pagination, filtering, localization, rate limits, health checks, or error behavior under `src/api`, update `README.md` public routes/query sections and `docs/api-standards.md`.
- When changing dataset release configuration, `dataset-releases.json`, release source parsing, GitHub sync behavior, local release loading, release manifest validation, or artifact layout, update `docs/dataset-loading.md` and `docs/release-manifest.md`.
- When changing Prisma models, migrations, read-model import/query logic, cache behavior, or CLI refresh commands, update `docs/read-model-architecture.md`, `README.md`, and any affected migration or local read-model instructions.
- When adding support for a new dataset domain, update `README.md`, `docs/dataset-loading.md`, `dataset-releases.json`, the relevant API modules/controllers/services, read-model docs, tests, and website/data-repo references in the same feature branch.
- When public hosting requirements, Docker build behavior, environment variable contracts, migrations, or health/readiness checks change, update `docs/deployment.md` and `.env.example` as needed. Keep live deployment tooling, operations, and operator procedures in private operational storage.
- When dataset contribution policy, PR workflow, or public API compatibility expectations change, update `docs/dataset-contribution-policy.md`, `docs/pull-request-workflow.md`, `CONTRIBUTING.md`, and `CHANGELOG.md` when the change is release-visible.

## Local Skills

Read the matching `SKILL.md` before using a local skill.

- `nestjs-best-practices`: use when writing, reviewing, or refactoring NestJS modules, providers, controllers, guards, filters, interceptors, dependency injection, security, or performance-sensitive API code.
- `nodejs-backend-patterns`: use when designing API boundaries, middleware-like flows, authentication/security behavior, database integration, service architecture, external integrations, or operational backend patterns.
- `nodejs-best-practices`: use when making general Node.js decisions around async work, runtime behavior, process/file handling, security, or maintainable service structure.
- `typescript-advanced-types`: use when introducing or simplifying generics, conditional types, mapped types, utility types, strongly typed DTO helpers, or compile-time constraints.
- `zod`: use when defining or refactoring validation schemas, `safeParse` flows, inferred DTO/data types, or validation error handling.
