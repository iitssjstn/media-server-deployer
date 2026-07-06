import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.ansible_runner import run_plex_deployment
from app.keystore import generate_keypair, get_private_key_path
from app.models import (
    DeploymentStatus,
    DeployRequest,
    DeployResponse,
    KeyGenerateResponse,
)
from app.state import deployments

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.post("/keys/generate", response_model=KeyGenerateResponse)
async def generate_ssh_key():
    key_id, public_key = generate_keypair()
    return KeyGenerateResponse(key_id=key_id, public_key=public_key)


@router.post("/deploy", response_model=DeployResponse)
async def deploy_plex(request: DeployRequest, background_tasks: BackgroundTasks):
    key_path = get_private_key_path(request.key_id)
    if not key_path:
        raise HTTPException(
            status_code=404,
            detail="SSH key not found. Generate a key first.",
        )

    task_id = str(uuid.uuid4())
    deployments[task_id] = DeploymentStatus(task_id=task_id)

    background_tasks.add_task(run_plex_deployment, task_id, request)

    return DeployResponse(
        task_id=task_id,
        message="Deployment started. Use the task_id to check status.",
    )


@router.get("/deploy/{task_id}/status", response_model=DeploymentStatus)
async def get_deploy_status(task_id: str):
    status = deployments.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return status
