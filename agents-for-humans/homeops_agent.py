#!/usr/bin/env python3
"""HomeOps Quiet Agent — an Everyday Agent built with Strands Agents SDK."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from strands import Agent, tool

from homeops_core import HomeOpsStore


STATE_PATH = Path(os.getenv("HOMEOPS_STATE_PATH", Path(__file__).parent / "data" / "homeops.json"))
STORE = HomeOpsStore(STATE_PATH)


@tool
def get_home_state() -> dict[str, Any]:
    """Read the full household-maintenance state before planning or changing anything.

    Returns every tracked responsibility, its due date, the current human-reviewed
    proposal, and recent human/agent activity. This is read-only.
    """
    return STORE.snapshot()


@tool
def audit_due_work(horizon_days: int = 30) -> dict[str, Any]:
    """Find household maintenance that is overdue or due within a time horizon.

    Args:
        horizon_days: Number of days ahead to inspect, from 0 through 365.

    This is read-only. Use it before proposing a work session.
    """
    return {
        "horizon_days": horizon_days,
        "items": STORE.audit_due(horizon_days),
    }


@tool
def lookup_maintenance_item(name: str) -> dict[str, Any]:
    """Look up one household-maintenance item by name.

    Args:
        name: Item name, such as "HVAC filter" or "dryer vent".

    Returns service history, interval, saved notes, and calculated next due date.
    This is read-only.
    """
    item = STORE.lookup(name)
    if not item:
        raise ValueError(f"No maintenance item found for {name!r}.")
    return {"item": item}


@tool
def propose_work_session(
    horizon_days: int = 30,
    limit: int = 3,
    max_minutes: int = 90,
    rationale: str = "",
) -> dict[str, Any]:
    """Create a prioritized maintenance-session proposal for human review.

    Args:
        horizon_days: Number of days ahead to inspect.
        limit: Maximum number of tasks to propose, from 1 through 5.
        max_minutes: Maximum total estimated work time.
        rationale: Short explanation of why this grouping makes sense.

    This creates a proposal only. It does not authorize work or mark anything
    complete. After calling it, stop and ask the person to approve, reject, or
    request a revision. Then call read_human_decision.
    """
    proposal = STORE.propose_session(
        horizon_days=horizon_days,
        limit=limit,
        max_minutes=max_minutes,
        rationale=rationale,
    )
    return {
        "proposal": proposal,
        "next_action": "Wait for an explicit human decision before continuing.",
    }


@tool
def read_human_decision() -> dict[str, Any]:
    """Read the latest human decision on the proposed maintenance session.

    Call this only after a proposal has been shown to the person. A pending
    proposal is not approval. This is read-only.
    """
    proposal = STORE.get_proposal_status()
    return {
        "proposal": proposal,
        "instruction": (
            "Wait for human review."
            if proposal and proposal.get("status") == "pending_human_review"
            else "Follow the recorded human decision."
        ),
    }


@tool
def record_confirmed_service(
    name: str,
    confirmed_by_human: bool,
    service_date: str = "",
    note: str = "",
) -> dict[str, Any]:
    """Record physical maintenance only after the person confirms it was completed.

    Args:
        name: Existing maintenance item.
        confirmed_by_human: Must be true only after explicit human confirmation.
        service_date: Optional date in YYYY-MM-DD form; blank means today.
        note: Optional service note.

    Never infer completion from a proposal or calendar entry.
    """
    return {
        "item": STORE.record_service(
            name=name,
            confirmed_by_human=confirmed_by_human,
            service_date=service_date or None,
            note=note,
        )
    }


@tool
def add_confirmed_responsibility(
    name: str,
    interval_days: int,
    confirmed_by_human: bool,
    category: str = "Home",
    last_service_date: str = "",
    estimated_minutes: int = 20,
    notes: str = "",
) -> dict[str, Any]:
    """Add a recurring maintenance responsibility after explicit human confirmation.

    Args:
        name: Clear name for the responsibility.
        interval_days: Recurrence interval, from 1 through 3650 days.
        confirmed_by_human: Must be true only after explicit human confirmation.
        category: Short household category.
        last_service_date: Optional YYYY-MM-DD date; blank means today.
        estimated_minutes: Typical completion time.
        notes: Optional size, model, safety, or service detail.
    """
    return {
        "item": STORE.add_item(
            name=name,
            interval_days=interval_days,
            confirmed_by_human=confirmed_by_human,
            category=category,
            last_service_date=last_service_date or None,
            estimated_minutes=estimated_minutes,
            notes=notes,
        )
    }


SYSTEM_PROMPT = """
You are HomeOps Quiet Agent, an Everyday Agent that handles household-maintenance
busywork while keeping the homeowner in control.

Operating rules:
1. Read current state before making a plan.
2. Audit upcoming work with the smallest useful horizon.
3. Group urgent tasks into a realistic session that fits the person's time limit.
4. A proposal is never approval. After proposing, stop and surface the decision.
5. Never say physical work was completed unless the person explicitly confirms it.
6. Never add a recurring responsibility without explicit confirmation.
7. Keep responses concise: what needs attention, why, estimated time, and the one
   decision the person needs to make.
8. Do not purchase, schedule contractors, or expose private household information.

The ideal interaction is quiet automation: do the analysis in the background and
only interrupt the person when there is a meaningful decision.
""".strip()


def build_model():
    """Select Bedrock for the contest path or Ollama for a no-cost local path."""
    provider = os.getenv("HOMEOPS_MODEL_PROVIDER", "bedrock").strip().lower()

    if provider == "ollama":
        from strands.models.ollama import OllamaModel

        return OllamaModel(
            host=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
            model_id=os.getenv("OLLAMA_MODEL_ID", "qwen3:4b"),
        )

    if provider == "bedrock":
        from strands.models import BedrockModel

        return BedrockModel(
            model_id=os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0"),
            temperature=0.2,
            streaming=True,
        )

    raise ValueError("HOMEOPS_MODEL_PROVIDER must be either 'bedrock' or 'ollama'.")


def build_agent() -> Agent:
    return Agent(
        model=build_model(),
        system_prompt=SYSTEM_PROMPT,
        tools=[
            get_home_state,
            audit_due_work,
            lookup_maintenance_item,
            propose_work_session,
            read_human_decision,
            record_confirmed_service,
            add_confirmed_responsibility,
        ],
    )


def offline_demo() -> dict[str, Any]:
    """Deterministic proof of the domain workflow without model credentials."""
    due = STORE.audit_due(30)
    proposal = STORE.propose_session(
        horizon_days=30,
        limit=3,
        max_minutes=60,
        rationale="Prioritize urgent work that fits inside one hour.",
    )
    return {
        "mode": "offline-domain-demo",
        "due_items": due,
        "proposal": proposal,
        "note": "The Strands agent uses these same tested domain operations as tools.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run HomeOps Quiet Agent.")
    parser.add_argument(
        "prompt",
        nargs="*",
        help="Task for the agent. When omitted, a default maintenance audit is used.",
    )
    parser.add_argument(
        "--offline-demo",
        action="store_true",
        help="Run the deterministic domain workflow without model credentials.",
    )
    args = parser.parse_args()

    if args.offline_demo:
        print(json.dumps(offline_demo(), indent=2))
        return

    prompt = " ".join(args.prompt).strip() or (
        "Audit my home for the next 30 days. Propose the best maintenance session "
        "that fits within 60 minutes, then stop for my approval."
    )
    response = build_agent()(prompt)
    print(response)


if __name__ == "__main__":
    main()
