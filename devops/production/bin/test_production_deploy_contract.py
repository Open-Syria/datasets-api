import unittest
from pathlib import Path


DEPLOY_SCRIPT = Path(__file__).with_name("deploy.sh")


class ProductionDeployContractTest(unittest.TestCase):
    def test_uses_approved_network_diagnostics(self) -> None:
        script = DEPLOY_SCRIPT.read_text(encoding="utf-8")

        self.assertIn('docker_cmd network-exists "${EDGE_NETWORK}"', script)
        self.assertIn('docker_cmd network-exists "${DATA_NETWORK}"', script)
        self.assertNotIn("docker_cmd network inspect", script)


if __name__ == "__main__":
    unittest.main()
