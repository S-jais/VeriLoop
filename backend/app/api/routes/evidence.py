"""Evidence API routes."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import EvidenceItem
from app.services.tavily_service import TavilyEvidenceService

router = APIRouter()


class ResearchRequest(BaseModel):
    query: str
    reason: str
    failure_id: str | None = None


@router.post("/research")
async def trigger_research(req: ResearchRequest, db: AsyncSession = Depends(get_db)):
    """Trigger Tavily evidence research for a failure."""
    import uuid
    svc = TavilyEvidenceService()
    results, is_live = await svc.research(
        query=req.query,
        reason=req.reason,
        failure_id=req.failure_id,
    )

    saved = []
    for ev in results:
        item = EvidenceItem(
            id=str(uuid.uuid4()),
            failure_id=req.failure_id,
            query=ev.query,
            source_url=ev.source_url,
            source_title=ev.source_title,
            content_summary=ev.content_summary,
            reason_for_research=ev.reason,
        )
        db.add(item)
        saved.append(item)
    await db.commit()

    return {
        "is_live_search": is_live,
        "results_count": len(saved),
        "results": [
            {
                "id": s.id,
                "query": s.query,
                "source_url": s.source_url,
                "source_title": s.source_title,
                "content_summary": s.content_summary,
            }
            for s in saved
        ],
    }


@router.get("")
async def list_evidence(failure_id: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(EvidenceItem).order_by(EvidenceItem.retrieved_at.desc()).limit(50)
    if failure_id:
        query = query.where(EvidenceItem.failure_id == failure_id)
    result = await db.execute(query)
    items = result.scalars().all()
    return [
        {
            "id": e.id,
            "failure_id": e.failure_id,
            "query": e.query,
            "source_url": e.source_url,
            "source_title": e.source_title,
            "content_summary": e.content_summary,
            "retrieved_at": e.retrieved_at.isoformat() if e.retrieved_at else None,
            "reason_for_research": e.reason_for_research,
        }
        for e in items
    ]
