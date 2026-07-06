import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router
from app.state import deployments


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    deployments.clear()


app = FastAPI(
    title="Media Server Deployer API",
    description="API for deploying Plex Media Server via Ansible",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
