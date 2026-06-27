# Dataset Contribution Policy

OpenSyria dataset repositories should accept community contributions, but the contribution scope must stay controlled.

The maintainer owns:

- dataset subjects,
- schemas and required fields,
- validation rules,
- release timing,
- source acceptance rules,
- API compatibility decisions.

Community contributions should focus on improving the approved datasets, not changing the product direction of the data model.

## Default Allowed Contributions

Dataset repositories should accept pull requests for:

- fixing incorrect values,
- adding missing records within the approved dataset scope,
- adding missing aliases, translations, or transliterations,
- improving source attribution,
- replacing weak sources with stronger reusable sources,
- correcting administrative relationships,
- correcting coordinates when the dataset schema already includes coordinates,
- marking records as deprecated, closed, renamed, merged, or uncertain when supported by sources.

Examples:

- Add a missing public university to `data-universities`.
- Correct the Arabic name of a city.
- Add an official source URL for a faculty.
- Fix a district relationship for a locality.
- Add a known alias or alternate transliteration.

## Not Accepted as Normal Pull Requests

The following should not be accepted as regular contributor PRs:

- new dataset topics,
- new fields,
- schema changes,
- ID format changes,
- release pipeline changes,
- validation rule changes,
- large automated imports without prior maintainer approval,
- data from unclear, proprietary, non-commercial, or no-redistribution sources,
- personal, private, sensitive, military, checkpoint, surveillance, or security-related data.

These changes can still be discussed, but they require maintainer approval before implementation.

## Schema Evolution

New fields are not forbidden, but they must go through a schema proposal first.

A schema proposal should answer:

- What user need does this field solve?
- Is the field useful for a large portion of the dataset?
- Can the field be sourced legally and consistently?
- Is the field safe to publish?
- Should the field live on the main record or a child record?
- Can it be optional at first?
- What validation rules apply?
- How will existing records be migrated?
- How will the API expose it without breaking existing users?

The maintainer decides whether to accept the proposal, revise it, postpone it, or reject it.

## Example: University Coordinates

If the first universities schema includes only `name`, `description`, and `image`, a contributor should not directly open a PR adding a `coordinates` field.

The better process:

1. Open a schema proposal explaining why coordinates are useful.
2. Confirm reusable sources exist for most universities or campuses.
3. Decide whether coordinates belong on `university`, `campus`, or both.
4. Make the field optional first.
5. Add validation rules for latitude and longitude.
6. Add source attribution requirements for every coordinate.
7. Update examples, docs, validation, and release artifacts.

For universities, coordinates often belong on campuses because one university can have multiple campus locations. A root-level coordinate can be allowed only when it clearly represents the main campus or headquarters and the source supports that meaning.

## Contribution Review Checklist

Every data PR should answer:

- What records changed?
- What sources support the change?
- Does the source license allow reuse?
- Is the change within the current schema?
- Does the change avoid personal and sensitive data?
- Did validation pass?

Maintainers should reject or pause a PR when:

- the source cannot be verified,
- the license is unclear,
- the change changes schema without approval,
- the data is too sensitive,
- the contribution mixes unrelated changes,
- the contribution depends on AI output as a source.

## AI Assistance

AI may help with cleanup, matching, translation suggestions, deduplication, and review notes.

AI must not be treated as a source. Every record should be traceable to reviewable public sources or maintainer-reviewed local knowledge when appropriate.

## Recommended Dataset Repo Files

Each dataset repository should include:

```text
README.md
CONTRIBUTING.md
DATA_SCHEMA.md
SOURCES.md
CHANGELOG.md
data/
schemas/
scripts/
.github/PULL_REQUEST_TEMPLATE.md
.github/ISSUE_TEMPLATE/data_correction.yml
.github/ISSUE_TEMPLATE/missing_data.yml
.github/ISSUE_TEMPLATE/schema_proposal.yml
```

## Recommended Labels

```text
data-correction
missing-data
source-update
translation
needs-source
license-review
schema-proposal
maintainer-approved
blocked
```

The `schema-proposal` label should not imply acceptance. It only means the proposal is being evaluated.

