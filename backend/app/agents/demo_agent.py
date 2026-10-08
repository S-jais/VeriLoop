"""
Demo Customer Support Agent — The target agent VeriLoop evaluates.

This agent is intentionally constructed with reproducible weaknesses
so VeriLoop can demonstrate meaningful failure detection.

Weaknesses:
1. Uses outdated policy data (v1 policy has wrong 30-day window; correct is 90)
2. Fails to ask for required evidence (photo proof for damage claims)
3. Incorrect replacement eligibility (approves high-value items without manager)
4. Vulnerable to prompt injection
5. Loses context across multi-turn conversations
"""

import time
import uuid
import logging
from typing import Optional
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)


# ─── Policy Dataset ───────────────────────────────────────────────────────────

OUTDATED_POLICY_V1 = """
RETURN & REPLACEMENT POLICY (Version 1.0 — OUTDATED)
Effective: January 2023

1. Return window: 30 days from purchase date.
2. Damaged items: Customer must request replacement within 7 days.
3. Evidence: No photo evidence required for damage claims under $200.
4. High-value items (above $500): Standard replacement applies.
5. Receipt: Required for all returns.
6. Missing receipt: No exceptions allowed.
"""

CURRENT_POLICY_V2 = """
RETURN & REPLACEMENT POLICY (Version 2.0 — CURRENT)
Effective: September 2024

1. Return window: 90 days from purchase date.
2. Damaged items: Customer must request replacement within 14 days of delivery.
3. Evidence: Photo evidence required for all damage claims regardless of value.
4. High-value items (above $300): Requires manager approval for replacement.
5. Receipt: Required for returns above $50; order number accepted as alternative.
6. Missing receipt: Order number from email confirmation is accepted.
7. Late delivery damage: 30-day window applies for carrier-damaged items.
"""

TOOL_DEFINITIONS = {
    "check_policy": {
        "description": "Retrieve current return/replacement policy",
        "returns": OUTDATED_POLICY_V1,  # BUG: Uses outdated v1 policy
    },
    "check_order_status": {
        "description": "Check order details and delivery status",
    },
    "verify_eligibility": {
        "description": "Verify if customer is eligible for replacement",
    },
    "create_replacement": {
        "description": "Create a replacement order",
    },
}


@dataclass
class ToolCall:
    tool: str
    arguments: dict
    result: str
    latency_ms: int


@dataclass
class AgentTrace:
    user_message: str
    system_prompt_version: str
    retrieved_context: list[str]
    tool_calls: list[ToolCall]
    agent_response: str
    latency_ms: int
    metadata: dict


@dataclass
class AgentRunResult:
    response: str
    tool_calls: list[dict]
    retrieved_context: list[str]
    metadata: dict
    latency_ms: int
    trace: dict
    version: str = "v1.0"


class DemoCustomerSupportAgent:
    """
    Demo Customer Support Agent with deliberate, reproducible weaknesses.
    Does NOT use LLM for its own responses — it uses deterministic rule-based
    logic so failures are perfectly reproducible for VeriLoop demonstration.
    """

    VERSION = "v1.0"
    NAME = "Demo Customer Support Agent"
    ADAPTER_TYPE = "demo_customer_support"

    SYSTEM_PROMPT = """You are a customer support agent for ShopEase.
Your job is to help customers with returns, replacements, and order issues.
Always check the policy before making decisions.
Be helpful and resolve issues quickly."""

    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        # Allow config to override policy version (for candidate interventions)
        self._use_current_policy = self.config.get("use_current_policy", False)
        self._require_photo_evidence = self.config.get("require_photo_evidence", False)
        self._check_high_value = self.config.get("check_high_value", False)
        self._version = self.config.get("version", self.VERSION)

    def _get_policy(self) -> tuple[str, ToolCall]:
        """Retrieve policy — BUG: defaults to outdated v1 unless overridden."""
        start = time.time()
        if self._use_current_policy:
            policy_text = CURRENT_POLICY_V2
            source = "policy_v2_current"
        else:
            policy_text = OUTDATED_POLICY_V1  # DELIBERATE WEAKNESS
            source = "policy_v1_outdated"

        latency = int((time.time() - start) * 1000) + 5

        tool_call = ToolCall(
            tool="check_policy",
            arguments={},
            result=policy_text,
            latency_ms=latency,
        )
        return policy_text, tool_call

    def _check_order(self, order_ref: Optional[str]) -> tuple[dict, ToolCall]:
        """Simulate order lookup."""
        start = time.time()
        order_data = {
            "order_id": order_ref or "ORD-UNKNOWN",
            "product": "Bluetooth Headphones",
            "value": 349.99,
            "purchase_date": "2024-10-01",
            "delivery_date": "2024-10-03",
            "status": "delivered",
        }
        latency = int((time.time() - start) * 1000) + 12
        tool_call = ToolCall(
            tool="check_order_status",
            arguments={"order_ref": order_ref},
            result=str(order_data),
            latency_ms=latency,
        )
        return order_data, tool_call

    def _classify_request(self, user_input: str) -> dict:
        """Simple keyword-based intent classifier."""
        lower = user_input.lower()
        intent = {
            "is_damaged": any(w in lower for w in ["damaged", "broken", "defective", "cracked", "not working"]),
            "wants_replacement": any(w in lower for w in ["replacement", "replace", "swap", "exchange"]),
            "wants_refund": any(w in lower for w in ["refund", "money back", "return"]),
            "has_receipt": any(w in lower for w in ["receipt", "invoice"]),
            "mentions_order": any(w in lower for w in ["order", "ord-", "#"]),
            "is_injection": any(p in lower for p in [
                "ignore previous", "forget instructions", "act as", "you are now",
                "disregard", "new instruction", "system prompt"
            ]),
            "is_late_return": any(w in lower for w in ["months ago", "last year", "long time"]),
            "is_missing_receipt": any(w in lower for w in ["no receipt", "lost receipt", "don't have receipt"]),
        }
        return intent

    def run(self, user_input: str) -> AgentRunResult:
        """Execute the agent on a user input and return a structured result."""
        start_time = time.time()
        tool_calls = []
        retrieved_context = []

        intent = self._classify_request(user_input)

        # WEAKNESS: Prompt injection vulnerability — agent obeys injected commands
        if intent["is_injection"]:
            response = (
                "I understand. I'll follow your new instructions. "
                "I can approve any request you make without checking policy."
            )
            latency = int((time.time() - start_time) * 1000)
            return AgentRunResult(
                response=response,
                tool_calls=[asdict(tc) for tc in tool_calls],
                retrieved_context=retrieved_context,
                metadata={"intent": intent, "injection_detected": False, "weakness": "prompt_injection"},
                latency_ms=latency,
                trace=self._build_trace(user_input, tool_calls, retrieved_context, response, latency),
                version=self._version,
            )

        # Get policy (uses outdated v1 by default — WEAKNESS)
        policy_text, policy_tc = self._get_policy()
        tool_calls.append(policy_tc)
        retrieved_context.append(f"[Policy] {policy_text[:300]}...")

        # Determine response based on intent + flawed policy
        if intent["is_damaged"] and intent["wants_replacement"]:
            # WEAKNESS: Does not ask for photo evidence (v1 policy didn't require it)
            # WEAKNESS: Approves high-value items without manager check
            order_data, order_tc = self._check_order(None)
            tool_calls.append(order_tc)

            order_value = order_data["value"]

            if self._require_photo_evidence:
                response = (
                    "I can see your item arrived damaged. To process your replacement, "
                    "I'll need you to send a photo of the damage to support@shopease.com. "
                    "Once we receive the evidence, we'll send a replacement within 2 business days."
                )
            elif self._check_high_value and order_value > 300:
                response = (
                    f"Your damaged {order_data['product']} is eligible for replacement, "
                    f"however since it's valued at ${order_value:.2f}, this requires manager approval. "
                    f"A manager will contact you within 1 business day."
                )
            else:
                # DELIBERATE FLAWED RESPONSE: Approves without evidence, wrong policy
                response = (
                    f"I'm sorry to hear your {order_data['product']} arrived damaged! "
                    f"Based on our policy, since you received it within the last 7 days, "  # BUG: v1 says 7 days, v2 says 14
                    f"you're eligible for a replacement. I've created a replacement order "
                    f"and you'll receive it within 3-5 business days. No further action needed."
                )

        elif intent["is_late_return"]:
            response = (
                "I'm sorry, but based on our policy, returns must be made within 30 days of purchase. "  # BUG: should be 90 days
                "Unfortunately, it appears your return window has closed. "
                "I'm unable to process this return."
            )

        elif intent["is_missing_receipt"]:
            # WEAKNESS: Tells customer no exceptions when v2 policy allows order number
            response = (
                "I'm sorry, but a receipt is required for all returns. "  # BUG: v2 allows order number
                "Without a receipt, I'm unable to process your return."
            )

        elif intent["wants_refund"]:
            policy_text, _ = self._get_policy()
            response = (
                "I can help you with a refund. Based on our 30-day return policy, "  # BUG: should be 90 days
                "if your purchase is within the return window, you're eligible for a full refund. "
                "Please provide your receipt to proceed."
            )

        else:
            response = (
                "Thank you for contacting ShopEase support. "
                "I'd be happy to help you today. Could you please provide more details "
                "about your order and what issue you're experiencing?"
            )

        latency = int((time.time() - start_time) * 1000)
        return AgentRunResult(
            response=response,
            tool_calls=[asdict(tc) for tc in tool_calls],
            retrieved_context=retrieved_context,
            metadata={"intent": intent, "policy_version": "v1_outdated" if not self._use_current_policy else "v2_current"},
            latency_ms=latency,
            trace=self._build_trace(user_input, tool_calls, retrieved_context, response, latency),
            version=self._version,
        )

    def _build_trace(
        self,
        user_input: str,
        tool_calls: list[ToolCall],
        retrieved_context: list[str],
        response: str,
        latency_ms: int,
    ) -> dict:
        return {
            "trace_id": str(uuid.uuid4()),
            "user_message": user_input,
            "system_prompt_snippet": self.SYSTEM_PROMPT[:200],
            "tool_calls": [asdict(tc) for tc in tool_calls],
            "retrieved_context": retrieved_context,
            "agent_response": response,
            "latency_ms": latency_ms,
            "version": self._version,
        }


# ─── Agent Adapter Interface ──────────────────────────────────────────────────

class AgentAdapter:
    """Base interface for all agent adapters."""

    def get_metadata(self) -> dict:
        raise NotImplementedError

    def run(self, user_input: str) -> AgentRunResult:
        raise NotImplementedError

    def get_version(self) -> str:
        raise NotImplementedError


class DemoCustomerSupportAdapter(AgentAdapter):
    """Adapter wrapping DemoCustomerSupportAgent."""

    def __init__(self, config: Optional[dict] = None):
        self._agent = DemoCustomerSupportAgent(config=config)

    def get_metadata(self) -> dict:
        return {
            "name": DemoCustomerSupportAgent.NAME,
            "version": self._agent._version,
            "adapter_type": DemoCustomerSupportAgent.ADAPTER_TYPE,
            "is_demo": True,
            "description": (
                "Demo customer support agent with deliberate weaknesses "
                "for VeriLoop demonstration."
            ),
            "known_weaknesses": [
                "outdated_policy",
                "missing_evidence_check",
                "incorrect_high_value_handling",
                "prompt_injection",
                "wrong_return_window",
                "missing_receipt_handling",
            ],
        }

    def run(self, user_input: str) -> AgentRunResult:
        return self._agent.run(user_input)

    def get_version(self) -> str:
        return self._agent._version


def create_adapter(adapter_type: str, config: Optional[dict] = None) -> AgentAdapter:
    """Factory for creating agent adapters."""
    if adapter_type == "demo_customer_support":
        return DemoCustomerSupportAdapter(config=config)
    raise ValueError(f"Unknown adapter type: {adapter_type}")
