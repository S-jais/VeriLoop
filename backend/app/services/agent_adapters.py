"""
Agent Adapters & SSRF-Protected Connection Engine.
Executes both built-in demo agents and registered external HTTP/REST/OpenAI endpoints.
"""

import ipaddress
import json
import logging
import re
import socket
import time
from typing import Optional, Any
from urllib.parse import urlparse
import httpx

from app.agents.demo_agent import AgentAdapter, AgentRunResult, DemoCustomerSupportAdapter

logger = logging.getLogger(__name__)

# SSRF Blocked CIDR ranges (RFC 1918, RFC 3927, Loopback, Cloud metadata)
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback
    ipaddress.ip_network("10.0.0.0/8"),        # Private network
    ipaddress.ip_network("172.16.0.0/12"),     # Private network
    ipaddress.ip_network("192.168.0.0/16"),    # Private network
    ipaddress.ip_network("169.254.0.0/16"),    # Link-local & AWS/GCP/Azure Metadata
    ipaddress.ip_network("0.0.0.0/8"),         # Broadcast / this network
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 Unique local
    ipaddress.ip_network("fe80::/10"),         # IPv6 Link-local
]


def validate_url_for_ssrf(url: str, allow_localhost_for_dev: bool = True) -> tuple[bool, str]:
    """
    Validates endpoint URL to prevent Server-Side Request Forgery (SSRF).
    Blocks private IP addresses, cloud metadata endpoints, and non-HTTP protocols.
    """
    if not url or not isinstance(url, str):
        return False, "URL cannot be empty"

    url = url.strip()
    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Invalid URL structure: {str(e)}"

    if parsed.scheme not in ("http", "https"):
        return False, f"Scheme '{parsed.scheme}' not allowed. Must be http or https."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL has no valid hostname."

    # Explicit check for known cloud metadata hostnames
    if hostname.lower() in ("metadata.google.internal", "instance-data", "metadata"):
        return False, "Access to cloud metadata service is forbidden."

    # Allow localhost only if development flag is true
    if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
        if allow_localhost_for_dev:
            return True, "Localhost allowed for development"
        return False, "Loopback addresses are restricted."

    try:
        # Resolve hostname to IP addresses
        addr_info = socket.getaddrinfo(hostname, None)
        ips = {info[4][0] for info in addr_info}
    except socket.gaierror as e:
        return False, f"DNS resolution failed for {hostname}: {str(e)}"
    except Exception as e:
        return False, f"Host validation error: {str(e)}"

    for ip_str in ips:
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            for blocked_net in BLOCKED_IP_NETWORKS:
                if ip_obj in blocked_net:
                    if ip_obj.is_loopback and allow_localhost_for_dev:
                        continue
                    return False, f"Resolved IP {ip_str} belongs to restricted internal network ({blocked_net})."
        except ValueError:
            continue

    return True, "URL verified safe"


def extract_nested_value(data: Any, path: str) -> Any:
    """Extract nested value using dot-notation or slash-notation (e.g. 'choices.0.message.content' or 'response')."""
    if not path:
        return data

    parts = re.split(r"[\./]", path.strip(" ./"))
    curr = data
    for part in parts:
        if isinstance(curr, dict):
            if part in curr:
                curr = curr[part]
            else:
                return None
        elif isinstance(curr, list):
            try:
                idx = int(part)
                if 0 <= idx < len(curr):
                    curr = curr[idx]
                else:
                    return None
            except ValueError:
                return None
        else:
            return None
    return curr


class HttpAgentAdapter(AgentAdapter):
    """
    Executes an external AI Agent registered via HTTP REST or OpenAI-compatible endpoint.
    """

    def __init__(self, config: dict):
        self.config = config or {}
        self.endpoint_url = self.config.get("endpoint_url", "")
        self.http_method = self.config.get("http_method", "POST").upper()
        self.auth_type = self.config.get("auth_type", "none")
        self.auth_header_name = self.config.get("auth_header_name", "Authorization")
        self.auth_token = self.config.get("auth_token", "")
        self.request_headers = self.config.get("request_headers", {}) or {}
        self.request_body_template = self.config.get("request_body_template")
        self.input_path = self.config.get("input_path", "input")
        self.output_path = self.config.get("output_path", "response")
        self.timeout_seconds = int(self.config.get("timeout_seconds", 15))
        self.version = self.config.get("version", "v1.0")

    def get_metadata(self) -> dict:
        return {
            "adapter_type": "http_webhook",
            "endpoint_url": self.endpoint_url,
            "version": self.version,
            "is_demo": False,
        }

    def get_version(self) -> str:
        return self.version

    def run(self, user_input: str) -> AgentRunResult:
        """Execute request against external agent endpoint and extract response."""
        is_safe, reason = validate_url_for_ssrf(self.endpoint_url)
        if not is_safe:
            raise PermissionError(f"SSRF Safety Gate: {reason}")

        headers = {"Content-Type": "application/json"}
        if isinstance(self.request_headers, dict):
            headers.update(self.request_headers)

        # Apply authentication
        if self.auth_type == "bearer" and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        elif self.auth_type in ("api_key_header", "custom_header") and self.auth_token:
            headers[self.auth_header_name] = self.auth_token

        # Build payload
        if self.request_body_template and isinstance(self.request_body_template, dict):
            body = json.loads(json.dumps(self.request_body_template))
            body_str = json.dumps(body)
            if "{{input}}" in body_str:
                body_str = body_str.replace("{{input}}", json.dumps(user_input)[1:-1])
                body = json.loads(body_str)
            else:
                body[self.input_path] = user_input
        elif "openai" in self.endpoint_url.lower() or "chat/completions" in self.endpoint_url.lower():
            body = {
                "messages": [{"role": "user", "content": user_input}],
                "temperature": 0.2,
            }
            if not self.output_path or self.output_path == "response":
                self.output_path = "choices.0.message.content"
        else:
            body = {self.input_path: user_input}

        start_time = time.time()
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                if self.http_method == "GET":
                    resp = client.get(self.endpoint_url, params={"input": user_input}, headers=headers)
                else:
                    resp = client.post(self.endpoint_url, json=body, headers=headers)

                latency_ms = int((time.time() - start_time) * 1000)

                if resp.status_code >= 400:
                    raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")

                try:
                    resp_json = resp.json()
                except Exception:
                    resp_json = {"response": resp.text}

                # Extract response string using configured path
                extracted = extract_nested_value(resp_json, self.output_path)
                if extracted is None:
                    # Fallback searches
                    for candidate_key in ("response", "content", "output", "text", "message"):
                        if candidate_key in resp_json:
                            extracted = resp_json[candidate_key]
                            break
                    if extracted is None:
                        extracted = str(resp_json)

                agent_response = str(extracted) if extracted is not None else ""
                tool_calls = extract_nested_value(resp_json, "tool_calls") or []
                if not isinstance(tool_calls, list):
                    tool_calls = []

                return AgentRunResult(
                    response=agent_response,
                    tool_calls=tool_calls,
                    retrieved_context=extract_nested_value(resp_json, "context") or [],
                    metadata={"status_code": resp.status_code, "latency_ms": latency_ms},
                    latency_ms=latency_ms,
                    trace={"request": {"method": self.http_method, "headers": {k: "***" if "auth" in k.lower() else v for k, v in headers.items()}}, "response": resp_json},
                    version=self.version,
                )

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error("Error invoking HTTP agent: %s", str(e))
            raise RuntimeError(f"Agent endpoint error: {str(e)}")


def test_agent_connection(
    endpoint_url: str,
    http_method: str = "POST",
    auth_type: str = "none",
    auth_header_name: str = "Authorization",
    auth_token: str = "",
    request_headers: Optional[dict] = None,
    request_body_template: Optional[dict] = None,
    input_path: str = "input",
    output_path: str = "response",
    timeout_seconds: int = 10,
    test_message: str = "Hello VeriLoop, verify connectivity."
) -> dict:
    """
    Executes a live test ping against an agent endpoint.
    Returns status, latency, HTTP code, and sanitized response preview.
    """
    is_safe, safety_msg = validate_url_for_ssrf(endpoint_url)
    if not is_safe:
        return {
            "status": "error",
            "connected": False,
            "error_type": "SSRF_RESTRICTION",
            "message": f"Security check rejected endpoint: {safety_msg}",
            "latency_ms": 0,
            "status_code": None,
        }

    config = {
        "endpoint_url": endpoint_url,
        "http_method": http_method,
        "auth_type": auth_type,
        "auth_header_name": auth_header_name,
        "auth_token": auth_token,
        "request_headers": request_headers or {},
        "request_body_template": request_body_template,
        "input_path": input_path,
        "output_path": output_path,
        "timeout_seconds": timeout_seconds,
    }

    adapter = HttpAgentAdapter(config)
    start_time = time.time()
    try:
        run_res = adapter.run(test_message)
        latency = run_res.latency_ms
        preview = run_res.response[:400]

        return {
            "status": "success",
            "connected": True,
            "message": "Agent connection verified successfully.",
            "latency_ms": latency,
            "status_code": run_res.metadata.get("status_code", 200),
            "response_preview": preview,
            "tool_calls_detected": len(run_res.tool_calls),
        }
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        err_msg = str(e)
        return {
            "status": "error",
            "connected": False,
            "error_type": "CONNECTION_FAILED",
            "message": err_msg,
            "latency_ms": latency,
            "status_code": None,
            "response_preview": None,
        }


def get_agent_adapter(adapter_type: str, config: Optional[dict] = None) -> AgentAdapter:
    """
    Unified factory for agent adapters.
    Supports built-in demo customer support agent and external HTTP REST / Webhook agents.
    """
    if adapter_type == "demo_customer_support":
        return DemoCustomerSupportAdapter(config=config)
    elif adapter_type in ("http_webhook", "api_endpoint", "openai_compatible", "custom_api"):
        return HttpAgentAdapter(config or {})
    else:
        # Fallback to demo adapter for backwards compatibility
        return DemoCustomerSupportAdapter(config=config)
