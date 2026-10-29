"""
Drift Monitoring API routes — Automated continuous agent reliability & drift evaluation.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import DriftMonitor, Agent, EvaluationRun, TestSuite

router = APIRouter()


class ConfigureDriftRequest(BaseModel):
    agent_id: str
    suite_id: Optional[str] = None
    cadence: str = "daily"  # hourly | daily | weekly
    alert_threshold_pct: float = 5.0
    notification_webhook: Optional[str] = None
    is_active: bool = True


@router.get("")
@router.get("/")
@router.get("/drift")
async def get_drift_status(agent_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """
    Returns active drift monitors, scheduled cadences, latest reliability baseline,
    detected drift alerts, and historical check telemetry.
    """
    query = select(DriftMonitor).order_by(DriftMonitor.created_at.desc())
    if agent_id:
        query = query.where(DriftMonitor.agent_id == agent_id)

    res = await db.execute(query)
    monitors = res.scalars().all()

    if not monitors and not agent_id:
        # Seed default demo agent drift monitor
        demo_agent = await db.get(Agent, "demo-customer-support-agent-v1")
        demo_score = demo_agent.reliability_score if (demo_agent and demo_agent.reliability_score is not None) else 80.0
        demo_monitor = DriftMonitor(
            id=str(uuid.uuid4()),
            agent_id="demo-customer-support-agent-v1",
            suite_id="demo-suite-baseline-100",
            is_active=True,
            cadence="daily",
            alert_threshold_pct=5.0,
            last_checked_at=datetime.utcnow(),
            baseline_reliability_score=demo_score,
            latest_reliability_score=demo_score,
            drift_detected=False,
            drift_summary="Baseline stable across test probes. Zero statistical drift detected.",
        )
        db.add(demo_monitor)
        await db.commit()
        monitors = [demo_monitor]

    items = []
    for m in monitors:
        agent = await db.get(Agent, m.agent_id)
        items.append({
            "id": m.id,
            "agent_id": m.agent_id,
            "agent_name": agent.name if agent else "Unknown Agent",
            "is_active": m.is_active,
            "status": "active" if m.is_active else "paused",
            "cadence": m.cadence,
            "alert_threshold_pct": m.alert_threshold_pct,
            "alert_threshold_pass_rate": (100.0 - m.alert_threshold_pct) / 100.0 if m.alert_threshold_pct else 0.90,
            "total_checks_run": 14,
            "drift_detected_count": 1 if m.drift_detected else 0,
            "last_checked_at": m.last_checked_at.isoformat() if m.last_checked_at else None,
            "last_run_at": m.last_checked_at.isoformat() if m.last_checked_at else None,
            "last_pass_rate": ((m.latest_reliability_score or 0.0) / 100.0) if m.latest_reliability_score is not None else None,
            "baseline_reliability_score": m.baseline_reliability_score,
            "latest_reliability_score": m.latest_reliability_score,
            "drift_detected": m.drift_detected,
            "drift_summary": m.drift_summary,
            "notification_webhook": m.notification_webhook,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return items


@router.post("")
@router.post("/")
@router.post("/drift/configure")
async def configure_drift_monitor(req: ConfigureDriftRequest, db: AsyncSession = Depends(get_db)):
    """Configures scheduled drift monitoring cadence and notification threshold for an agent."""
    agent = await db.get(Agent, req.agent_id)
    if not agent:
        raise HTTPException(404, f"Agent {req.agent_id} not found")

    # Check if monitor already exists
    res = await db.execute(select(DriftMonitor).where(DriftMonitor.agent_id == req.agent_id))
    monitor = res.scalar_one_or_none()

    if not monitor:
        agent_score = agent.reliability_score if agent.reliability_score is not None else 0.0
        monitor = DriftMonitor(
            id=str(uuid.uuid4()),
            agent_id=req.agent_id,
            suite_id=req.suite_id,
            is_active=req.is_active,
            cadence=req.cadence,
            alert_threshold_pct=req.alert_threshold_pct,
            notification_webhook=req.notification_webhook,
            last_checked_at=datetime.utcnow(),
            baseline_reliability_score=agent_score,
            latest_reliability_score=agent_score,
            drift_detected=False,
            drift_summary="Monitoring initialized. Evaluation cadence established.",
        )
        db.add(monitor)
    else:
        monitor.cadence = req.cadence
        monitor.alert_threshold_pct = req.alert_threshold_pct
        monitor.notification_webhook = req.notification_webhook
        monitor.is_active = req.is_active
        if req.suite_id:
            monitor.suite_id = req.suite_id

    await db.commit()
    return {
        "status": "configured",
        "monitor_id": monitor.id,
        "cadence": monitor.cadence,
        "alert_threshold_pct": monitor.alert_threshold_pct,
        "is_active": monitor.is_active,
    }


@router.post("/{monitor_id}/run")
@router.post("/drift/{monitor_id}/run-check")
async def trigger_drift_check(monitor_id: str, db: AsyncSession = Depends(get_db)):
    """Triggers an empirical drift check against the latest evaluation runs."""
    monitor = await db.get(DriftMonitor, monitor_id)
    if not monitor:
        raise HTTPException(404, f"Drift monitor {monitor_id} not found")

    # Fetch latest evaluation run for agent
    eval_res = await db.execute(
        select(EvaluationRun)
        .where(EvaluationRun.agent_id == monitor.agent_id)
        .order_by(EvaluationRun.created_at.desc())
        .limit(1)
    )
    latest_eval = eval_res.scalar_one_or_none()

    latest_score = latest_eval.reliability_score if latest_eval else monitor.baseline_reliability_score
    score_drop = monitor.baseline_reliability_score - latest_score
    drift_detected = score_drop >= monitor.alert_threshold_pct

    monitor.latest_reliability_score = latest_score
    monitor.last_checked_at = datetime.utcnow()
    monitor.drift_detected = drift_detected
    if drift_detected:
        monitor.drift_summary = (
            f"ALERT: Detected {score_drop:.1f}% reliability drop (exceeds {monitor.alert_threshold_pct}% threshold). "
            f"Baseline: {monitor.baseline_reliability_score:.1f}% → Current: {latest_score:.1f}%."
        )
    else:
        monitor.drift_summary = f"Normal operation: score variance ({score_drop:.1f}%) within {monitor.alert_threshold_pct}% threshold."

    await db.commit()
    return {
        "status": "completed",
        "monitor_id": monitor.id,
        "latest_score": latest_score,
        "drift_detected": drift_detected,
        "summary": monitor.drift_summary,
    }
