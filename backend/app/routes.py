import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.ansible_runner import run_plex_deployment
from app.models import (
    DeploymentStatus,
    DeployRequest,
    DeployResponse,
)
from app.state import deployments

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.post("/deploy", response_model=DeployResponse)
async def deploy_plex(request: DeployRequest, background_tasks: BackgroundTasks):
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
