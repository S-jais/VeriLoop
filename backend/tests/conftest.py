import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app.core.config import get_settings

@pytest.fixture(autouse=True)
def mock_external_apis():
    """
    Ensure unit tests run offline and deterministically without consuming
    live inference API quotas or incurring network latency.
    """
    settings = get_settings()
    original_nebius_key = settings.nebius_api_key
    original_tavily_key = settings.tavily_api_key

    settings.nebius_api_key = ""
    settings.tavily_api_key = ""

    yield

    settings.nebius_api_key = original_nebius_key
    settings.tavily_api_key = original_tavily_key
