import os
import subprocess
import tempfile
from pathlib import Path

from app.models import DeploymentState, DeployRequest
from app.state import deployments

ANSIBLE_DIR = Path(__file__).resolve().parent.parent.parent / "ansible"


def run_plex_deployment(task_id: str, request: DeployRequest) -> None:
    status = deployments[task_id]
    status.state = DeploymentState.RUNNING
    status.message = "Connecting to server and starting deployment..."

    try:
        inventory_content = (
            f"[media_servers]\n"
            f"{request.server_ip} "
            f"ansible_port={request.ssh_port} "
            f"ansible_user={request.ssh_user}"
        )

        env = os.environ.copy()
        env["ANSIBLE_HOST_KEY_CHECKING"] = "False"
        env["ANSIBLE_SSH_ARGS"] = "-o StrictHostKeyChecking=no"

        with tempfile.TemporaryDirectory() as tmpdir:
            inventory_path = os.path.join(tmpdir, "inventory")
            with open(inventory_path, "w") as f:
                f.write(inventory_content)

            cmd = [
                "ansible-playbook",
                "-i", inventory_path,
                str(ANSIBLE_DIR / "playbook.yml"),
                "-v",
                "--extra-vars", f"ansible_password={request.ssh_password}",
            ]

            status.log.append(f"Running Ansible playbook against {request.server_ip}...")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,
                env=env,
            )

            stdout_lines = result.stdout.strip().split("\n") if result.stdout else []
            stderr_lines = result.stderr.strip().split("\n") if result.stderr else []

            status.log.extend(stdout_lines)

            if result.returncode == 0:
                status.state = DeploymentState.SUCCESS
                status.message = "Plex Media Server deployed successfully!"
            else:
                status.state = DeploymentState.FAILED
                status.message = "Deployment failed. Check logs for details."
                status.log.extend(stderr_lines)

    except subprocess.TimeoutExpired:
        status.state = DeploymentState.FAILED
        status.message = "Deployment timed out after 10 minutes."
    except Exception as e:
        status.state = DeploymentState.FAILED
        status.message = f"Deployment error: {str(e)}"
        status.log.append(str(e))
