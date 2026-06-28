# Security Policy

Please do not report security vulnerabilities through public GitHub issues.

## Reporting a Vulnerability

Use GitHub private vulnerability reporting when it is available for this repository:

```text
https://github.com/Open-Syria/datasets-api/security/advisories/new
```

If private vulnerability reporting is not available, contact the project maintainers privately through the OpenSyria organization.

## What to Include

Include enough detail for maintainers to reproduce and assess the issue:

- affected route, command, workflow, or dependency,
- impact and likely severity,
- reproduction steps,
- relevant non-sensitive logs,
- affected version, branch, or commit,
- whether the issue is already public.

Do not include secrets, private tokens, private infrastructure URLs, personal data, or restricted data in the report.

## Scope

Security reports can include:

- dependency vulnerabilities,
- unsafe request handling,
- path traversal or file-read issues,
- CORS or security-header misconfiguration,
- Docker or deployment hardening issues,
- CI or supply-chain weaknesses,
- accidental exposure of secrets or private data.

Dataset record corrections, missing records, and source disagreements are not security reports unless they expose private, personal, restricted, military, or surveillance-related information.

## Public Disclosure

Please give maintainers reasonable time to investigate and prepare a fix before public disclosure.
