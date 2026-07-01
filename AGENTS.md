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

## Local Skills

Read the matching `SKILL.md` before using a local skill.

- `nestjs-best-practices`: use when writing, reviewing, or refactoring NestJS modules, providers, controllers, guards, filters, interceptors, dependency injection, security, or performance-sensitive API code.
- `nodejs-backend-patterns`: use when designing API boundaries, middleware-like flows, authentication/security behavior, database integration, service architecture, external integrations, or operational backend patterns.
- `nodejs-best-practices`: use when making general Node.js decisions around async work, runtime behavior, process/file handling, security, or maintainable service structure.
- `typescript-advanced-types`: use when introducing or simplifying generics, conditional types, mapped types, utility types, strongly typed DTO helpers, or compile-time constraints.
- `zod`: use when defining or refactoring validation schemas, `safeParse` flows, inferred DTO/data types, or validation error handling.
