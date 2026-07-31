#!/usr/bin/env python3

import os
import re
import shlex
import sys
import tempfile
from pathlib import Path


EXPECTED_VALUES = {
    "APP_API_PREFIX": "api",
    "APP_API_VERSION": "1",
    "APP_BODY_LIMIT_BYTES": "65536",
    "APP_CORS_CREDENTIALS": "false",
    "APP_CORS_ORIGIN": "https://opensyria.org",
    "APP_DEBUG": "false",
    "APP_DOCS_ENABLED": "true",
    "APP_ENV": "production",
    "APP_FALLBACK_LANGUAGE": "en",
    "APP_LOG_LEVEL": "info",
    "APP_LOG_PRETTY": "false",
    "APP_NAME": "opensyria-datasets-api",
    "APP_PORT": "3000",
    "APP_TRUST_PROXY": "true",
    "APP_URL": "https://api.opensyria.org",
    "CACHE_TTL_SECONDS": "300",
    "DATABASE_ENABLED": "true",
    "DATABASE_LOG_QUERIES": "false",
    "DATABASE_REQUIRED": "true",
    "DATASETS_RELEASES_DIR": "data/releases",
    "DATASETS_RELEASE_SOURCES_FILE": "dataset-releases.json",
    "DATASETS_RELEASE_SOURCES_OVERRIDE": "false",
    "DATASETS_REQUIRE_RELEASES": "true",
    "DATASETS_SYNC_DOWNLOAD_ARTIFACTS": "true",
    "IS_HTTPS": "true",
    "NODE_ENV": "production",
    "REDIS_ENABLED": "true",
    "REDIS_REQUIRED": "true",
    "THROTTLE_FREE_TIER_DAILY_LIMIT": "500",
    "THROTTLE_FREE_TIER_DAILY_TTL_SECONDS": "86400",
}
EXPECTED_KEYS = set(EXPECTED_VALUES) | {"DATABASE_URL", "REDIS_URL"}
DATABASE_URL_PATTERN = re.compile(
    r"postgresql://opensyria_datasets_production:[0-9a-f]{64}"
    r"@infra-postgres:5432/opensyria_datasets_production\?schema=public"
)
REDIS_URL_PATTERN = re.compile(
    r"redis://:[0-9a-f]{64}@opensyria-production-redis:6379/0"
)
DATASET_KEYS = {
    "DATASETS_RELEASES_DIR",
    "DATASETS_RELEASE_SOURCES_FILE",
    "DATASETS_RELEASE_SOURCES_OVERRIDE",
    "DATASETS_REQUIRE_RELEASES",
    "DATASETS_SYNC_DOWNLOAD_ARTIFACTS",
}


def fail(message: str) -> None:
    raise SystemExit(f"Invalid production runtime environment: {message}")


def parse_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}

    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line.removeprefix("export ").lstrip()

        key, separator, raw_value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
            fail(f"malformed line {line_number}")
        if key in values:
            fail(f"duplicate key {key}")

        lexer = shlex.shlex(raw_value, posix=True)
        lexer.whitespace_split = True
        lexer.commenters = ""
        tokens = list(lexer)
        if len(tokens) > 1:
            fail(f"malformed value for {key}")
        values[key] = tokens[0] if tokens else ""

    return values


def validate_database_url(value: str) -> None:
    if not DATABASE_URL_PATTERN.fullmatch(value):
        fail("DATABASE_URL does not target the isolated OpenSyria production database")


def validate_redis_url(value: str) -> None:
    if not REDIS_URL_PATTERN.fullmatch(value):
        fail("REDIS_URL does not target the dedicated OpenSyria production Redis database")


def write_subset(directory: Path, name: str, values: dict[str, str]) -> None:
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{name}.", dir=directory)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as file:
            for key in sorted(values):
                value = values[key]
                if "\n" in value or "\r" in value:
                    fail(f"operation value for {key} contains a newline")
                file.write(f"{key}={value}\n")
        temporary.chmod(0o600)
        temporary.replace(directory / name)
    finally:
        temporary.unlink(missing_ok=True)


def write_operation_envs(directory: Path, values: dict[str, str]) -> None:
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if not directory.is_dir() or directory.is_symlink():
        fail("operation environment directory must be a real directory")
    directory.chmod(0o700)

    write_subset(directory, "migrate.env", {"DATABASE_URL": values["DATABASE_URL"]})
    write_subset(directory, "datasets.env", {key: values[key] for key in DATASET_KEYS})
    write_subset(
        directory,
        "import.env",
        {
            "CACHE_TTL_SECONDS": values["CACHE_TTL_SECONDS"],
            "DATABASE_ENABLED": values["DATABASE_ENABLED"],
            "DATABASE_LOG_QUERIES": values["DATABASE_LOG_QUERIES"],
            "DATABASE_REQUIRED": values["DATABASE_REQUIRED"],
            "DATABASE_URL": values["DATABASE_URL"],
            "NODE_ENV": values["NODE_ENV"],
            "REDIS_ENABLED": "false",
            "REDIS_REQUIRED": "false",
            **{key: values[key] for key in DATASET_KEYS},
        },
    )


def main() -> None:
    if len(sys.argv) not in (2, 4):
        fail(
            "usage: validate-runtime-env.py <dotenv-file> "
            "[--write-operation-envs <directory>]"
        )

    path = Path(sys.argv[1])
    if not path.is_file() or path.is_symlink() or path.stat().st_size == 0:
        fail("the exported dotenv file must be a non-empty regular file")

    values = parse_dotenv(path)
    missing = sorted(EXPECTED_KEYS - set(values))
    unexpected = sorted(set(values) - EXPECTED_KEYS)
    if missing:
        fail(f"missing keys: {', '.join(missing)}")
    if unexpected:
        fail(f"unexpected or forbidden keys: {', '.join(unexpected)}")

    mismatched = [
        key for key, expected in EXPECTED_VALUES.items() if values.get(key) != expected
    ]
    if mismatched:
        fail(f"incorrect values for: {', '.join(sorted(mismatched))}")

    validate_database_url(values["DATABASE_URL"])
    validate_redis_url(values["REDIS_URL"])

    if len(sys.argv) == 4:
        if sys.argv[2] != "--write-operation-envs":
            fail("unsupported operation")
        write_operation_envs(Path(sys.argv[3]), values)


if __name__ == "__main__":
    main()
