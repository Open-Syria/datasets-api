# Pull Request Workflow

`datasets-api` is public for transparency, auditability, and reuse, but implementation is maintainer-led.

Most public contribution should happen in dataset repositories. This API repository accepts only changes that are maintainer-authored, maintainer-requested, documentation corrections, reproducible bug fixes, or automated dependency updates.

## Table of Contents

- [Branches](#branches)
- [Pull Request Scope](#pull-request-scope)
- [Commit Messages](#commit-messages)
- [Review Requirements](#review-requirements)
- [Validation](#validation)
- [Dataset Boundary](#dataset-boundary)
- [Merge Guidance](#merge-guidance)
- [Release Notes](#release-notes)

## Branches

Use short, descriptive branch names:

| Change | Branch format |
| --- | --- |
| Feature or maintainer task | `feat/<short-description>` |
| Bug fix | `fix/<short-description>` |
| Documentation | `docs/<short-description>` |
| Tooling or CI | `chore/<short-description>` |
| Dependency updates | `deps/<package-or-area>` |

Examples:

```text
feat/geography-read-model
fix/release-manifest-validation
docs/deployment-notes
chore/codeql-private-repo-guard
```

## Pull Request Scope

Allowed PRs:

- maintainer-authored implementation work
- maintainer-requested changes linked to an issue or discussion
- reproducible API bug fixes
- documentation corrections
- CI, tooling, deployment, or dependency maintenance
- automated dependency update PRs

Not accepted as unsolicited PRs:

- new endpoint families
- new public API designs
- auth, subscriptions, billing, admin, or website-backend features
- dataset source changes
- dataset schema changes without maintainer approval
- large refactors unrelated to a specific issue

## Commit Messages

Use Conventional Commits:

```text
feat: add geography release import
fix: reject invalid release artifact paths
docs: update deployment guide
chore: tune codeql workflow
```

Commit types commonly used here:

| Type | Use |
| --- | --- |
| `feat` | Maintainer-approved product/API behavior |
| `fix` | Bug fixes |
| `docs` | Documentation only |
| `test` | Test-only changes |
| `refactor` | Internal code changes without behavior changes |
| `chore` | Tooling, CI, config, repository maintenance |
| `deps` | Dependency updates |

## Review Requirements

Before merge, a PR should satisfy the relevant checks:

- Scope belongs in `datasets-api`.
- Public API behavior follows [API standards](api-standards.md).
- Query, params, and body inputs use Zod DTOs.
- Response envelopes use shared helpers.
- OpenAPI/Scalar docs are generated from DTOs and decorators.
- Dataset releases are consumed through pinned manifests and verified artifacts.
- Runtime serving uses the read model in production.
- Security headers, CORS, rate limiting, and deployment behavior are preserved.
- Docs are updated for changed routes, config, commands, or deployment steps.

## Validation

Run the full local validation before merging implementation changes:

```bash
pnpm run validate
```

For small documentation-only PRs, at minimum run:

```bash
pnpm run check
```

When Prisma models, migrations, or read-model imports change, also run the database integration suite:

```bash
docker compose up -d postgres redis
pnpm run test:integration:db
```

## Dataset Boundary

This API consumes released dataset artifacts. It does not own canonical dataset records.

Dataset corrections should go to the relevant dataset repository. API PRs should not directly change dataset source data, source attribution, or dataset contribution rules unless maintainers explicitly request a coordinated contract change.

## Merge Guidance

Use squash merge for normal PRs so `main` keeps a clean history.

Use a merge commit only when preserving multiple commits is important for review history or release coordination.

Before merging:

1. Confirm CI passed.
2. Confirm docs are updated.
3. Confirm no generated local artifacts, secrets, or environment files are included.
4. Confirm public API changes are intentional and documented.
5. Confirm deployment notes are updated when runtime configuration changes.

## Release Notes

When a PR changes production behavior, include release-note context in the PR body:

- changed endpoints
- changed response fields
- new or changed environment variables
- migration or import steps
- deployment order
- rollback considerations

Small docs-only or tooling-only changes can say `No release-note impact`.
