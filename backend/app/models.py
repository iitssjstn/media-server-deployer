from enum import Enum

from pydantic import BaseModel, Field


class DeployRequest(BaseModel):
    server_ip: str = Field(..., description="IP address of the target server")
    ssh_user: str = Field(..., description="SSH username")
    ssh_port: int = Field(default=22, ge=1, le=65535, description="SSH port")
    key_id: str = Field(..., description="ID of the server-generated SSH keypair")


class DeploymentState(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class DeploymentStatus(BaseModel):
    task_id: str
    state: DeploymentState = DeploymentState.PENDING
    message: str = "Deployment queued"
    log: list[str] = Field(default_factory=list)


class DeployResponse(BaseModel):
    task_id: str
    message: str


class KeyGenerateResponse(BaseModel):
    key_id: str
    public_key: str
