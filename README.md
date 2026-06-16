# Media Server Deployer

A web application that allows users to deploy a **Plex Media Server** on their own server with one click. The user provides their server IP and SSH credentials, and the system automatically provisions Plex using Ansible.

## Architecture

```
┌─────────────┐     API Call     ┌──────────────┐    SSH/Ansible    ┌──────────────┐
│   Next.js    │ ──────────────> │   FastAPI     │ ───────────────> │  User Server │
│   Frontend   │                 │   Backend     │                  │  (Plex)      │
└─────────────┘                  └──────────────┘                   └──────────────┘
```

- **Frontend** (Next.js): Web form where users enter server IP, SSH credentials, and click "Deploy"
- **Backend** (FastAPI): REST API that receives deployment requests and triggers Ansible playbooks
- **Ansible**: Playbook that installs and configures Plex Media Server on the target server

## Prerequisites

- Python 3.10+
- Node.js 18+
- Ansible 2.14+

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and the backend API on `http://localhost:8000`.

## API Endpoints

- `POST /api/deploy` – Start a new Plex deployment
- `GET /api/deploy/{task_id}/status` – Check deployment status
- `GET /api/health` – Health check

## How It Works

1. User fills in the form with their server's IP address, SSH username, and SSH password or key
2. Frontend sends a POST request to the FastAPI backend
3. Backend validates the input and triggers an Ansible playbook in the background
4. Ansible connects to the user's server via SSH and installs Plex Media Server
5. User can track the deployment progress via the status endpoint
