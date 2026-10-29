"""
Agents API routes — Complete agent lifecycle, connection testing, ZIP inspection, and version management.
"""

import hashlib
import json
import uuid
from datetime import datetime
from typing import Optional, Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.db.database import get_db
from app.db.models import Agent, AgentVersion, AgentStatus, EvaluationRun, Failure, TestSuite
from app.services.agent_adapters import test_agent_connection, validate_url_for_ssrf
from app.services.project_analyzer import ProjectAnalyzer

router = APIRouter()


class CreateAgentRequest(BaseModel):
    name: str
    description: str = ""
    adapter_type: str = "demo_customer_support"
    connection_type: str = "demo"  # demo | api_endpoint | zip_upload | github_repo | config_import
    is_demo: bool = False
    endpoint_url: Optional[str] = None
    http_method: str = "POST"
    auth_type: str = "none"  # none | bearer | api_key_header | basic
    auth_header_name: str = "Authorization"
    auth_token: Optional[str] = None
    request_headers: Dict[str, Any] = Field(default_factory=dict)
    request_body_template: Optional[Dict[str, Any]] = None
    input_path: str = "input"
    output_path: str = "response"
    timeout_seconds: int = 15
    retry_count: int = 2
    framework: str = "custom"
    repository_url: Optional[str] = None
    repository_branch: Optional[str] = "main"
    system_prompt: Optional[str] = None
    tools_schema: Optional[List[Dict[str, Any]]] = None


class TestConnectionRequest(BaseModel):
    endpoint_url: str
    http_method: str = "POST"
    auth_type: str = "none"
    auth_header_name: str = "Authorization"
    auth_token: Optional[str] = None
    request_headers: Dict[str, Any] = Field(default_factory=dict)
    request_body_template: Optional[Dict[str, Any]] = None
    input_path: str = "input"
    output_path: str = "response"
    timeout_seconds: int = 10
    test_message: str = "Hello VeriLoop, verify connectivity."


class AgentVersionRequest(BaseModel):
    version: str
    config: Dict[str, Any] = Field(default_factory=dict)
    notes: str = ""


class ImportConfigRequest(BaseModel):
    system_prompt: Optional[str] = None
    model_identifier: Optional[str] = None
    temperature: Optional[float] = 0.2
    tools: Optional[List[Dict[str, Any]]] = None
    framework: str = "custom"
    raw_config: Optional[Dict[str, Any]] = None


@router.post("/test-connection")
async def test_connection_endpoint(req: TestConnectionRequest):
    """
    Tests live connection against an external agent endpoint with SSRF protections.
    Never persists credentials. Returns status, latency ms, and sanitized output.
    """
    res = test_agent_connection(
        endpoint_url=req.endpoint_url,
        http_method=req.http_method,
        auth_type=req.auth_type,
        auth_header_name=req.auth_header_name,
        auth_token=req.auth_token or "",
        request_headers=req.request_headers,
        request_body_template=req.request_body_template,
        input_path=req.input_path,
        output_path=req.output_path,
        timeout_seconds=req.timeout_seconds,
        test_message=req.test_message,
    )
    return res


@router.post("/upload-zip")
async def upload_agent_zip(file: UploadFile = File(...)):
    """
    Uploads and statically analyzes an agent project ZIP archive.
    Enforces Zip-Slip and Zip-Bomb defenses. Extracts framework, AST tools, prompts, and manifests.
    """
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only ZIP archives are supported (.zip)")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(400, "Uploaded ZIP file is empty")

    analysis = ProjectAnalyzer.analyze_zip(content)
    artifact_hash = hashlib.sha256(content).hexdigest()
    analysis["artifact_hash"] = artifact_hash
    analysis["filename"] = file.filename
    analysis["size_bytes"] = len(content)

    return analysis


@router.post("/import-config")
async def import_agent_config(req: ImportConfigRequest):
    """
    Validates imported agent configuration (prompts, tool definitions, temperature).
    Identifies conflicting or missing parameters.
    """
    issues = []
    if not req.system_prompt and not req.raw_config:
        issues.append("No system prompt or raw configuration detected.")

    if req.temperature is not None and (req.temperature < 0.0 or req.temperature > 2.0):
        issues.append("Temperature must be between 0.0 and 2.0")

    tools_count = len(req.tools) if req.tools else 0

    return {
        "status": "valid" if len(issues) == 0 else "warning",
        "issues": issues,
        "parsed": {
            "system_prompt_length": len(req.system_prompt) if req.system_prompt else 0,
            "model_identifier": req.model_identifier or "nvidia/nemotron-3-nano-30b-a3b",
            "temperature": req.temperature or 0.2,
            "tools_detected": tools_count,
            "framework": req.framework,
        },
    }


@router.post("")
async def create_agent(req: CreateAgentRequest, db: AsyncSession = Depends(get_db)):
    """Registers an AI agent (demo, HTTP API, ZIP archive, or GitHub)."""
    # Mask token if supplied
    masked_token = None
    if req.auth_token:
        masked_token = f"••••••••{req.auth_token[-4:]}" if len(req.auth_token) >= 4 else "••••••••"

    agent = Agent(
        id=str(uuid.uuid4()),
        name=req.name.strip(),
        description=req.description.strip(),
        adapter_type=req.adapter_type,
        connection_type=req.connection_type,
        is_demo=req.is_demo,
        endpoint_url=req.endpoint_url.strip() if req.endpoint_url else None,
        http_method=req.http_method,
        auth_type=req.auth_type,
        auth_header_name=req.auth_header_name,
        auth_token_masked=masked_token,
        request_headers=req.request_headers,
        request_body_template=req.request_body_template,
        input_path=req.input_path,
        output_path=req.output_path,
        timeout_seconds=req.timeout_seconds,
        retry_count=req.retry_count,
        connection_status="connected",
        last_tested_at=datetime.utcnow(),
        framework=req.framework,
        repository_url=req.repository_url,
        repository_branch=req.repository_branch,
        system_prompt=req.system_prompt,
        tools_schema=req.tools_schema,
    )
    db.add(agent)

    # Initial baseline version snapshot
    version = AgentVersion(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        version="v1.0 (baseline)",
        status=AgentStatus.ACTIVE,
        config={
            "endpoint_url": req.endpoint_url,
            "http_method": req.http_method,
            "system_prompt": req.system_prompt,
            "adapter_type": req.adapter_type,
            "input_path": req.input_path,
            "output_path": req.output_path,
        },
        is_baseline=True,
        notes="Initial registered baseline version",
    )
    db.add(version)
    await db.commit()

    return {
        "id": agent.id,
        "version_id": version.id,
        "name": agent.name,
        "connection_type": agent.connection_type,
        "connection_status": agent.connection_status,
    }


@router.get("")
async def list_agents(db: AsyncSession = Depends(get_db)):
    """Lists all registered agents with version, status, and failure counts."""
    result = await db.execute(select(Agent).order_by(Agent.created_at.desc()))
    agents = result.scalars().all()

    items = []
    for a in agents:
        # Get latest version
        ver_res = await db.execute(
            select(AgentVersion).where(AgentVersion.agent_id == a.id).order_by(AgentVersion.created_at.desc()).limit(1)
        )
        latest_ver = ver_res.scalar_one_or_none()

        # Get latest evaluation
        eval_res = await db.execute(
            select(EvaluationRun).where(EvaluationRun.agent_id == a.id).order_by(EvaluationRun.created_at.desc()).limit(1)
        )
        latest_eval = eval_res.scalar_one_or_none()

        items.append({
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "adapter_type": a.adapter_type,
            "connection_type": a.connection_type or ("demo" if a.is_demo else "api_endpoint"),
            "connection_status": a.connection_status or "connected",
            "is_demo": a.is_demo,
            "framework": a.framework or "custom",
            "endpoint_url": a.endpoint_url,
            "current_version": latest_ver.version if latest_ver else "v1.0",
            "last_evaluation_status": latest_eval.status.value if latest_eval and hasattr(latest_eval.status, "value") else (latest_eval.status if latest_eval else None),
            "reliability_score": latest_eval.reliability_score if latest_eval else None,
            "critical_failures": latest_eval.critical_failures if latest_eval else 0,
            "total_tests": latest_eval.total_tests if latest_eval else 0,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "last_tested_at": a.last_tested_at.isoformat() if a.last_tested_at else None,
        })

    return items


@router.get("/{agent_id}")
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    """Gets complete details of an agent including versions and evaluation history."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, f"Agent {agent_id} not found")

    versions_res = await db.execute(
        select(AgentVersion).where(AgentVersion.agent_id == agent_id).order_by(AgentVersion.created_at.desc())
    )
    versions = versions_res.scalars().all()

    evals_res = await db.execute(
        select(EvaluationRun).where(EvaluationRun.agent_id == agent_id).order_by(EvaluationRun.created_at.desc()).limit(10)
    )
    evals = evals_res.scalars().all()

    return {
        "id": agent.id,
        "name": agent.name,
        "description": agent.description,
        "adapter_type": agent.adapter_type,
        "connection_type": agent.connection_type or ("demo" if agent.is_demo else "api_endpoint"),
        "connection_status": agent.connection_status or "connected",
        "is_demo": agent.is_demo,
        "framework": agent.framework or "custom",
        "endpoint_url": agent.endpoint_url,
        "http_method": agent.http_method,
        "auth_type": agent.auth_type,
        "auth_header_name": agent.auth_header_name,
        "auth_token_masked": agent.auth_token_masked,
        "input_path": agent.input_path,
        "output_path": agent.output_path,
        "timeout_seconds": agent.timeout_seconds,
        "repository_url": agent.repository_url,
        "repository_branch": agent.repository_branch,
        "system_prompt": agent.system_prompt,
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
        "last_tested_at": agent.last_tested_at.isoformat() if agent.last_tested_at else None,
        "versions": [
            {
                "id": v.id,
                "version": v.version,
                "status": v.status.value if hasattr(v.status, "value") else v.status,
                "is_baseline": v.is_baseline,
                "config": v.config,
                "notes": v.notes,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ],
        "recent_evaluations": [
            {
                "id": e.id,
                "status": e.status.value if hasattr(e.status, "value") else e.status,
                "reliability_score": e.reliability_score,
                "critical_failures": e.critical_failures,
                "total_tests": e.total_tests,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in evals
        ],
    }


@router.post("/{agent_id}/versions")
async def create_version(agent_id: str, req: AgentVersionRequest, db: AsyncSession = Depends(get_db)):
    """Creates a new immutable version snapshot for an agent."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, f"Agent {agent_id} not found")

    version = AgentVersion(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        version=req.version.strip(),
        status=AgentStatus.CANDIDATE,
        config=req.config,
        is_baseline=False,
        notes=req.notes.strip(),
    )
    db.add(version)
    await db.commit()
    return {"id": version.id, "version": version.version, "status": "candidate"}


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    """Deletes an agent (prohibits deleting default demo agent to preserve tour)."""
    if agent_id == "demo-customer-support-agent-v1":
        raise HTTPException(403, "Cannot delete default demo customer support agent")

    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, f"Agent {agent_id} not found")

    await db.delete(agent)
    await db.commit()
    return {"status": "deleted", "id": agent_id}
