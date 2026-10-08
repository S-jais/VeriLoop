"""
Tavily Evidence Research Service — Role 4: Evidence Researcher
Uses Tavily API to fetch external evidence when failure analysis requires it.
"""

import logging
from datetime import datetime
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EvidenceResult:
    def __init__(
        self,
        query: str,
        source_url: str,
        source_title: str,
        content_summary: str,
        retrieved_at: str,
        reason: str,
    ):
        self.query = query
        self.source_url = source_url
        self.source_title = source_title
        self.content_summary = content_summary
        self.retrieved_at = retrieved_at
        self.reason = reason


class TavilyEvidenceService:
    """
    Role 4: Evidence Researcher
    Uses Tavily to fetch real external evidence when needed.
    Gracefully degrades if Tavily is not configured.
    """

    def __init__(self):
        self._client = None
        if settings.is_tavily_configured():
            try:
                from tavily import TavilyClient
                self._client = TavilyClient(api_key=settings.tavily_api_key)
                logger.info("Tavily evidence research client initialized")
            except ImportError:
                logger.warning("tavily-python not installed. Evidence research will be unavailable.")

    async def research(
        self,
        query: str,
        reason: str,
        failure_id: Optional[str] = None,
        max_results: int = 3,
    ) -> tuple[list[EvidenceResult], bool]:
        """
        Research external evidence for a failure.
        Returns: (results, is_live_search)
        """
        if not self._client:
            logger.warning("Tavily not configured. Skipping evidence research.")
            return [], False

        logger.info("tavily_search query='%s' reason='%s'", query, reason)

        try:
            # Use run_async if available, otherwise wrap synchronous call
            import asyncio
            loop = asyncio.get_event_loop()
            search_result = await loop.run_in_executor(
                None,
                lambda: self._client.search(
                    query=query,
                    search_depth="basic",
                    max_results=max_results,
                )
            )

            results = []
            for item in search_result.get("results", []):
                results.append(EvidenceResult(
                    query=query,
                    source_url=item.get("url", ""),
                    source_title=item.get("title", "Unknown Source"),
                    content_summary=item.get("content", "")[:500],
                    retrieved_at=datetime.utcnow().isoformat(),
                    reason=reason,
                ))

            logger.info(
                "tavily_search_complete query='%s' results=%d",
                query, len(results)
            )
            return results, True

        except Exception as e:
            logger.error("Tavily search failed: %s", str(e))
            return [], False
