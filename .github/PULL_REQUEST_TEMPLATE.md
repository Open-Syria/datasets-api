## Summary

<!-- What changed, and why? Keep this short and concrete. -->

## Change Type

- [ ] Maintainer-authored implementation
- [ ] Maintainer-requested change
- [ ] Bug fix
- [ ] Documentation correction
- [ ] Dependency update
- [ ] CI, tooling, or maintenance

## Scope Gate

- [ ] This PR belongs in `datasets-api`.
- [ ] This PR does not introduce unsolicited API features.
- [ ] This PR does not change dataset source data or dataset contribution rules.
- [ ] This PR does not add auth, admin, subscription, billing, or website-backend behavior.

## API Contract

- [ ] Public routes, response envelopes, DTOs, and OpenAPI docs follow `docs/api-standards.md`.
- [ ] Query, params, and body inputs are validated through Zod DTOs.
- [ ] Response examples and docs were updated when public behavior changed.
- [ ] Breaking API changes are explicitly called out below.

## Data and Releases

- [ ] Dataset releases are still consumed through pinned manifests and verified artifacts.
- [ ] The API does not read live dataset repository branches at runtime.
- [ ] Any read-model changes include migration/import notes.

## Security and Operations

- [ ] No secrets, tokens, `.env` files, private data, or generated local artifacts are committed.
- [ ] New dependencies are necessary and compatible with the pnpm supply-chain policy.
- [ ] Deployment or environment-variable changes are documented.

## Validation

- [ ] `pnpm run check`
- [ ] `pnpm run lint`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run test`
- [ ] `pnpm run test:e2e`
- [ ] `pnpm run build`
- [ ] `pnpm run validate`
- [ ] Database integration tested when Prisma/read-model behavior changed

## Notes for Review

<!-- Add screenshots, API examples, migration notes, known tradeoffs, or follow-up work. -->
