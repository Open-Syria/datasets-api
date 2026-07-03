# Releases

`datasets-api` uses release-please to automate version bumps, changelog updates,
Git tags, and GitHub Releases for API repository changes.

This release flow is separate from dataset artifact releases. Dataset versions
served by production are still pinned in [`dataset-releases.json`](../dataset-releases.json).

Production deployment also remains SHA-pinned:

```text
ghcr.io/open-syria/datasets-api:sha-<short-sha>
ghcr.io/open-syria/datasets-api:sha-<short-sha>-migrations
```

`package.json` versions and GitHub Releases are human-facing release metadata,
not the deployment selector.

## How It Works

`.github/workflows/release-please.yml` runs on pushes to `main`.

The workflow reads:

```text
release-please-config.json
.release-please-manifest.json
```

When release-worthy Conventional Commits land on `main`, release-please opens or
updates a release pull request.

Merging that release pull request:

1. Updates `package.json`.
2. Updates `.release-please-manifest.json`.
3. Updates `CHANGELOG.md`.
4. Creates a Git tag such as `v0.1.0`.
5. Creates a GitHub Release.

No package is published to npm.

## Commit Types

Release-worthy examples:

```text
feat: add universities endpoint filters
fix: retry dataset release sync fetches
perf: reduce read-model query latency
```

Breaking changes use standard Conventional Commit syntax:

```text
feat!: change public response envelope
```

or:

```text
feat: change public response envelope

BREAKING CHANGE: public response envelope fields changed
```

Non-release examples:

```text
docs: update deployment notes
chore: update dependencies
test: add read-model coverage
ci: update workflow permissions
```

## Tokens

The workflow falls back to `GITHUB_TOKEN`.

For `GITHUB_TOKEN` to open release pull requests, the repository or organization
must allow GitHub Actions to create pull requests:

```text
Settings -> Actions -> General -> Workflow permissions
```

Enable **Allow GitHub Actions to create and approve pull requests**. The workflow
already requests `contents: write`, `issues: write`, and `pull-requests: write`,
but GitHub's repository or organization setting can still block pull request
creation.

If release-please pull requests need CI checks to run automatically under branch
protection, add a repository secret named:

```text
RELEASE_PLEASE_TOKEN
```

Use a fine-grained token or GitHub App token with permission to create pull
requests and write contents for this repository.

## Bootstrap

The release config uses `bootstrap-sha` so existing API history is treated as
already released at `0.0.1`.

Future release PRs should only include release-worthy commits after that
bootstrap point.
