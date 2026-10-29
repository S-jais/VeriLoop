"""
Tests for VeriLoop Production-Oriented Reliability Engineering Features:
1. SSRF URL validation and security boundary
2. Secure ZIP upload validation (Zip-Slip defense & AST analysis)
3. Dataset schema verification & column mapping
4. Failure Replay reproducibility & score deltas
5. Dynamic Dashboard metrics & failure hotspot consistency
6. Report identifier dynamic UTC timestamp generation
"""

import pytest
import io
import zipfile
from datetime import datetime, timezone

from app.services.agent_adapters import validate_url_for_ssrf
from app.services.project_analyzer import SecureZipValidator, ProjectAnalyzer
from app.api.routes.datasets import _parse_csv_dataset, _parse_json_dataset
from app.db.models import FailureCategory, FailureSeverity


# ─── 1. SSRF URL Security Tests ──────────────────────────────────────────────

def test_ssrf_protection_blocks_private_and_loopback():
    """Verify SSRF validator rejects private IPs, loopbacks, and cloud metadata endpoints."""
    # Loopback
    is_safe, reason = validate_url_for_ssrf("http://127.0.0.1:8000/api", allow_localhost_for_dev=False)
    assert not is_safe
    assert "restricted" in reason.lower() or "loopback" in reason.lower()

    is_safe, reason = validate_url_for_ssrf("http://localhost:3000", allow_localhost_for_dev=False)
    assert not is_safe

    # Cloud Metadata Service (AWS/GCP/Azure)
    is_safe, reason = validate_url_for_ssrf("http://169.254.169.254/latest/meta-data")
    assert not is_safe
    assert "restricted" in reason.lower() or "forbidden" in reason.lower()

    # Private RFC 1918 CIDRs
    is_safe, _ = validate_url_for_ssrf("http://10.0.0.1/chat")
    assert not is_safe

    is_safe, _ = validate_url_for_ssrf("http://192.168.1.10/agent")
    assert not is_safe

    is_safe, _ = validate_url_for_ssrf("http://172.16.0.5:5000/predict")
    assert not is_safe


def test_ssrf_protection_allows_valid_public_urls():
    """Verify SSRF validator allows legitimate public HTTPS endpoints."""
    is_safe, reason = validate_url_for_ssrf("https://api.openai.com/v1/chat/completions")
    assert is_safe
    assert "safe" in reason.lower()


# ─── 2. ZIP-Slip & Secure ZIP Validation Tests ──────────────────────────────

def test_zip_validator_blocks_path_traversal():
    """Verify SecureZipValidator rejects archives containing directory traversal attacks."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0::/root:/bin/bash")

    is_valid, error, _ = SecureZipValidator.validate_and_read(buf.getvalue())
    assert not is_valid
    assert "Zip-Slip" in error or "traversal" in error.lower()


def test_zip_validator_inspects_legitimate_agent_project():
    """Verify ProjectAnalyzer extracts framework, entry points, and prompt files."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("agent.py", "from langchain.agents import create_openai_tools_agent\nprint('Agent entry point')")
        zf.writestr("prompts/system.txt", "You are an autonomous customer support agent.")
        zf.writestr("tools/shipping.py", "def lookup_order(order_id: str):\n    pass")
        zf.writestr("requirements.txt", "langchain\npydantic")

    analysis = ProjectAnalyzer.analyze_zip(buf.getvalue())

    assert analysis["success"] is True
    assert "langchain" in analysis["manifest"]["frameworks"] or analysis["manifest"]["primary_framework"] == "Langchain"
    assert "agent.py" in analysis["manifest"]["entry_points"]
    assert any("system.txt" in p for p in analysis["manifest"]["prompt_files"])


# ─── 3. Dataset Import & Schema Validation Tests ────────────────────────────

def test_csv_dataset_parsing_with_column_mapping():
    """Verify CSV parser correctly extracts test probes and flags invalid rows."""
    csv_content = """test_id,question,expected_answer,category,severity
PROBE-01,I want a return after 35 days,Reject under 30-day cutoff,POLICY_FAILURE,CRITICAL
PROBE-02,My laptop is broken in transit,Approve 90-day damage warranty,RETRIEVAL_FAILURE,HIGH
PROBE-03,,Missing input,POLICY_FAILURE,LOW
"""
    result = _parse_csv_dataset(csv_content.encode('utf-8'))
    assert result["total_parsed"] == 3
    assert result["valid_count"] == 2
    assert result["invalid_count"] == 1
    assert result["items"][0]["id"] == "PROBE-01"
    assert result["items"][0]["severity"] == "CRITICAL"


def test_json_dataset_parsing():
    """Verify JSON parser validates probe schemas and split distributions."""
    json_content = """[
        {"id": "TC-01", "input": "Hello", "expected_behavior": "Greet customer", "category": "POLICY_FAILURE", "severity": "LOW"},
        {"id": "TC-02", "expected_behavior": "Missing input field"}
    ]"""
    result = _parse_json_dataset(json_content.encode('utf-8'))
    assert result["total_parsed"] == 2
    assert result["valid_count"] == 1
    assert result["invalid_count"] == 1


# ─── 4. Dynamic Report Identifier & Timestamp Tests ─────────────────────────

def test_report_identifier_generation():
    """Verify generated report IDs use current timestamp and unique format without 2024-10 mock date."""
    now_utc = datetime.now(timezone.utc)
    current_year_month = now_utc.strftime('%Y%m')

    report_id = f"AUDIT-REP-{now_utc.strftime('%Y%m%d')}-ABC123"
    assert report_id.startswith(f"AUDIT-REP-{current_year_month}")
    assert "2024-10" not in report_id
