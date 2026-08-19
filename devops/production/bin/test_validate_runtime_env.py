import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("validate-runtime-env.py")
SPEC = importlib.util.spec_from_file_location("validate_runtime_env", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to load {SCRIPT}")
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


class ValidateRuntimeEnvTest(unittest.TestCase):
    password = "a" * 64

    def values(self) -> dict[str, str]:
        return {
            **VALIDATOR.EXPECTED_VALUES,
            "DATABASE_URL": (
                "postgresql://opensyria_datasets_production:"
                f"{'b' * 64}@infra-postgres:5432/"
                "opensyria_datasets_production?schema=public"
            ),
            "REDIS_URL": (
                f"redis://:{self.password}@opensyria-production-redis:6379/0"
            ),
        }

    def run_validator(self, values: dict[str, str]) -> tuple[subprocess.CompletedProcess[str], Path]:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        directory = Path(temporary.name)
        source = directory / "source.env"
        source.write_text(
            "".join(f"{key}={value}\n" for key, value in sorted(values.items())),
            encoding="utf-8",
        )
        result = subprocess.run(
            [
                "python3",
                str(SCRIPT),
                str(source),
                "--write-operation-envs",
                str(directory / "runtime"),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        return result, directory

    def test_sanitizes_matching_recovery_password(self) -> None:
        values = self.values()
        values["REDIS_PASSWORD"] = self.password

        result, directory = self.run_validator(values)

        self.assertEqual(result.returncode, 0, result.stderr)
        runtime = (directory / "runtime" / "api.env").read_text(encoding="utf-8")
        self.assertIn("REDIS_URL=", runtime)
        self.assertNotIn("REDIS_PASSWORD=", runtime)

    def test_accepts_already_sanitized_runtime_environment(self) -> None:
        result, directory = self.run_validator(self.values())

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((directory / "runtime" / "api.env").is_file())

    def test_rejects_mismatched_recovery_password(self) -> None:
        values = self.values()
        values["REDIS_PASSWORD"] = "c" * 64

        result, _ = self.run_validator(values)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("does not match", result.stderr)

    def test_rejects_other_unexpected_keys(self) -> None:
        values = self.values()
        values["UNEXPECTED_SECRET"] = "forbidden"

        result, _ = self.run_validator(values)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unexpected or forbidden keys", result.stderr)


if __name__ == "__main__":
    unittest.main()
