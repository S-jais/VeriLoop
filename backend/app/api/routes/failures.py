"""Failures API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import Failure, EvidenceItem, TestResult, TestCase

router = APIRouter()


@router.get("")
async def list_failures(eval_id: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Failure).order_by(Failure.created_at.desc()).limit(50)
    if eval_id:
        query = query.where(Failure.evaluation_id == eval_id)
    result = await db.execute(query)
    failures = result.scalars().all()
    
    formatted = []
    for f in failures:
        item = _format_failure(f)
        if f.test_result_id:
            tr = await db.get(TestResult, f.test_result_id)
            if tr:
                tc = await db.get(TestCase, tr.test_case_id)
                item["test_input"] = tc.input if tc else None
                item["agent_response"] = tr.agent_response
        formatted.append(item)
    return formatted


@router.get("/{failure_id}")
async def get_failure(failure_id: str, db: AsyncSession = Depends(get_db)):
    failure = await db.get(Failure, failure_id)
    if not failure:
        raise HTTPException(404, "Failure not found")

    # Load related test result and test case
    test_result = None
    test_input = None
    if failure.test_result_id:
        test_result = await db.get(TestResult, failure.test_result_id)
        if test_result:
            test_case = await db.get(TestCase, test_result.test_case_id)
            test_input = test_case.input if test_case else None

    # Load evidence
    ev_result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.failure_id == failure_id)
    )
    evidence = ev_result.scalars().all()

    return {
        **_format_failure(failure),
        "test_input": test_input,
        "agent_response": test_result.agent_response if test_result else None,
        "tool_calls": test_result.tool_calls if test_result else [],
        "retrieved_context": test_result.retrieved_context if test_result else [],
        "trace": test_result.trace if test_result else {},
        "scores": test_result.scores if test_result else {},
        "evidence": [
            {
                "id": e.id,
                "query": e.query,
                "source_url": e.source_url,
                "source_title": e.source_title,
                "content_summary": e.content_summary,
                "retrieved_at": e.retrieved_at.isoformat() if e.retrieved_at else None,
                "reason_for_research": e.reason_for_research,
            }
            for e in evidence
        ],
    }


def _format_failure(f: Failure) -> dict:
    return {
        "id": f.id,
        "evaluation_id": f.evaluation_id,
        "test_result_id": f.test_result_id,
        "category": f.category.value if hasattr(f.category, "value") else f.category,
        "severity": f.severity.value if hasattr(f.severity, "value") else f.severity,
        "expected_behavior": f.expected_behavior,
        "observed_behavior": f.observed_behavior,
        "root_cause_hypothesis": f.root_cause_hypothesis,
        "root_cause_confidence": f.root_cause_confidence,
        "evidence_needed": f.evidence_needed,
        "recommended_interventions": f.recommended_interventions,
        "causal_graph": f.causal_graph,
        "status": f.status,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }
