import unittest
from pathlib import Path


DEPLOY_SCRIPT = Path(__file__).with_name("deploy.sh")
BACKUP_SCRIPT = Path(__file__).with_name("backup-postgres.sh")


class ProductionDeployContractTest(unittest.TestCase):
    def test_uses_approved_network_diagnostics(self) -> None:
        script = DEPLOY_SCRIPT.read_text(encoding="utf-8")

        self.assertIn('docker_cmd network-exists "${EDGE_NETWORK}"', script)
        self.assertIn('docker_cmd network-exists "${DATA_NETWORK}"', script)
        self.assertNotIn("docker_cmd network inspect", script)

    def test_uses_approved_container_diagnostics(self) -> None:
        script = DEPLOY_SCRIPT.read_text(encoding="utf-8")

        self.assertIn("docker_cmd ps --format '{{.Names}}'", script)
        self.assertIn('compose ps --format "${COMPOSE_PS_FORMAT}"', script)
        self.assertNotIn("docker_cmd inspect", script)
        self.assertNotIn("compose ps -q", script)

    def test_uses_fixed_api_release_probe(self) -> None:
        script = DEPLOY_SCRIPT.read_text(encoding="utf-8")

        self.assertIn(
            'compose exec -T "${service}" node -e "${API_RELEASE_PROBE}"',
            script,
        )
        self.assertNotIn("compose exec -T -e EXPECTED_RELEASE", script)

    def test_uses_typed_postgres_backup_operations(self) -> None:
        script = BACKUP_SCRIPT.read_text(encoding="utf-8")

        self.assertIn("docker_cmd dump-opensyria-database", script)
        self.assertIn("docker_cmd validate-postgres-dump", script)
        self.assertNotIn("docker_cmd exec", script)


if __name__ == "__main__":
    unittest.main()
