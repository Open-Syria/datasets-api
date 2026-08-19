import unittest
from pathlib import Path


DEPLOY_SCRIPT = Path(__file__).with_name("deploy.sh")


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


if __name__ == "__main__":
    unittest.main()
