"""Core persistent household-maintenance logic for HomeOps Quiet Agent.

This module intentionally has no cloud or LLM dependencies, which keeps the
domain rules testable independently from the Strands agent loop.
"""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable
from uuid import uuid4


DEFAULT_STATE: dict[str, Any] = {
    "version": 1,
    "items": [
        {
            "id": "hvac-filter",
            "name": "HVAC filter",
            "category": "Air quality",
            "interval_days": 90,
            "last_service_date": "2026-06-01",
            "estimated_minutes": 10,
            "notes": "20 x 20 x 1 filter",
        },
        {
            "id": "dryer-vent",
            "name": "Dryer vent",
            "category": "Laundry",
            "interval_days": 180,
            "last_service_date": "2026-03-05",
            "estimated_minutes": 35,
            "notes": "Clean the exterior flap and flexible duct",
        },
        {
            "id": "smoke-detectors",
            "name": "Smoke detector test",
            "category": "Safety",
            "interval_days": 90,
            "last_service_date": "2026-06-15",
            "estimated_minutes": 15,
            "notes": "Test every unit and replace weak batteries",
        },
        {
            "id": "water-heater",
            "name": "Water heater flush",
            "category": "Plumbing",
            "interval_days": 365,
            "last_service_date": "2025-10-01",
            "estimated_minutes": 60,
            "notes": "Annual sediment flush",
        },
    ],
    "proposal": None,
    "activity": [],
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Expected a date in YYYY-MM-DD format, received {value!r}.") from exc


def slugify(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    return "-".join(part for part in cleaned.split("-") if part)[:48] or f"item-{uuid4().hex[:8]}"


@dataclass(frozen=True)
class DueItem:
    id: str
    name: str
    category: str
    last_service_date: str
    interval_days: int
    next_due_date: str
    days_remaining: int
    estimated_minutes: int
    notes: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "last_service_date": self.last_service_date,
            "interval_days": self.interval_days,
            "next_due_date": self.next_due_date,
            "days_remaining": self.days_remaining,
            "estimated_minutes": self.estimated_minutes,
            "notes": self.notes,
        }


class HomeOpsStore:
    """JSON-backed state store with atomic writes and explicit approval gates."""

    def __init__(self, path: str | Path, *, today: date | None = None) -> None:
        self.path = Path(path)
        self.today = today or date.today()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write(json.loads(json.dumps(DEFAULT_STATE)))

    def _read(self) -> dict[str, Any]:
        with self.path.open("r", encoding="utf-8") as handle:
            state = json.load(handle)
        if not isinstance(state.get("items"), list):
            raise ValueError("HomeOps state is invalid: items must be a list.")
        return state

    def _write(self, state: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_name = tempfile.mkstemp(prefix=f"{self.path.name}.", dir=self.path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(state, handle, indent=2, sort_keys=True)
                handle.write("\n")
            os.replace(tmp_name, self.path)
        finally:
            if os.path.exists(tmp_name):
                os.unlink(tmp_name)

    @staticmethod
    def _activity(state: dict[str, Any], actor: str, action: str, detail: str) -> None:
        entries = state.setdefault("activity", [])
        entries.insert(
            0,
            {
                "id": f"activity-{uuid4().hex[:10]}",
                "actor": actor,
                "action": action,
                "detail": detail,
                "at": utc_now(),
            },
        )
        del entries[20:]

    def _enrich(self, raw: dict[str, Any]) -> DueItem:
        last = parse_iso_date(raw["last_service_date"])
        interval = int(raw["interval_days"])
        due = last + timedelta(days=interval)
        return DueItem(
            id=str(raw["id"]),
            name=str(raw["name"]),
            category=str(raw.get("category", "Home")),
            last_service_date=last.isoformat(),
            interval_days=interval,
            next_due_date=due.isoformat(),
            days_remaining=(due - self.today).days,
            estimated_minutes=int(raw.get("estimated_minutes", 20)),
            notes=str(raw.get("notes", "")),
        )

    def snapshot(self) -> dict[str, Any]:
        state = self._read()
        return {
            "generated_at": utc_now(),
            "items": [item.as_dict() for item in self._sorted_items(state["items"])],
            "proposal": state.get("proposal"),
            "activity": state.get("activity", []),
        }

    def _sorted_items(self, items: Iterable[dict[str, Any]]) -> list[DueItem]:
        return sorted((self._enrich(item) for item in items), key=lambda item: item.days_remaining)

    def audit_due(self, horizon_days: int = 30) -> list[dict[str, Any]]:
        horizon = max(0, min(int(horizon_days), 365))
        state = self._read()
        return [
            item.as_dict()
            for item in self._sorted_items(state["items"])
            if item.days_remaining <= horizon
        ]

    def lookup(self, name: str) -> dict[str, Any] | None:
        query = name.strip().lower()
        if not query:
            return None
        state = self._read()
        exact = next((item for item in state["items"] if item["name"].lower() == query), None)
        partial = next(
            (
                item
                for item in state["items"]
                if query in item["name"].lower() or item["name"].lower() in query
            ),
            None,
        )
        match = exact or partial
        return self._enrich(match).as_dict() if match else None

    def propose_session(
        self,
        *,
        horizon_days: int = 30,
        limit: int = 3,
        max_minutes: int = 90,
        rationale: str = "",
    ) -> dict[str, Any]:
        due = self.audit_due(horizon_days)
        safe_limit = max(1, min(int(limit), 5))
        budget = max(5, min(int(max_minutes), 480))

        chosen: list[dict[str, Any]] = []
        used = 0
        for item in due:
            minutes = max(5, int(item["estimated_minutes"]))
            if chosen and used + minutes > budget:
                continue
            chosen.append(item)
            used += minutes
            if len(chosen) >= safe_limit:
                break

        if not chosen:
            raise ValueError("No due work fits the requested time budget.")

        state = self._read()
        proposal = {
            "id": f"proposal-{uuid4().hex[:10]}",
            "status": "pending_human_review",
            "created_at": utc_now(),
            "horizon_days": int(horizon_days),
            "max_minutes": budget,
            "estimated_total_minutes": used,
            "rationale": (rationale or "Prioritized by urgency within the person's time budget.")[:300],
            "tasks": [
                {
                    "priority": index,
                    "item_id": item["id"],
                    "name": item["name"],
                    "days_remaining": item["days_remaining"],
                    "estimated_minutes": item["estimated_minutes"],
                }
                for index, item in enumerate(chosen, start=1)
            ],
            "human_note": "",
        }
        state["proposal"] = proposal
        self._activity(
            state,
            "agent",
            "proposed_session",
            f"Proposed {len(chosen)} tasks totaling about {used} minutes.",
        )
        self._write(state)
        return proposal

    def set_proposal_decision(self, *, decision: str, note: str = "") -> dict[str, Any]:
        normalized = decision.strip().lower()
        allowed = {"approved", "revision_requested", "rejected"}
        if normalized not in allowed:
            raise ValueError(f"decision must be one of: {', '.join(sorted(allowed))}.")

        state = self._read()
        proposal = state.get("proposal")
        if not proposal:
            raise ValueError("There is no active proposal to decide.")

        proposal["status"] = normalized
        proposal["human_note"] = note[:300]
        proposal["decided_at"] = utc_now()
        self._activity(state, "human", f"proposal_{normalized}", note or normalized)
        self._write(state)
        return proposal

    def get_proposal_status(self) -> dict[str, Any] | None:
        return self._read().get("proposal")

    def record_service(
        self,
        *,
        name: str,
        confirmed_by_human: bool,
        service_date: str | None = None,
        note: str = "",
    ) -> dict[str, Any]:
        if not confirmed_by_human:
            raise PermissionError("Explicit human confirmation is required before recording service.")

        state = self._read()
        query = name.strip().lower()
        raw = next(
            (
                item
                for item in state["items"]
                if item["name"].lower() == query
                or query in item["name"].lower()
                or item["name"].lower() in query
            ),
            None,
        )
        if not raw:
            raise ValueError(f"No maintenance item found for {name!r}.")

        raw["last_service_date"] = parse_iso_date(service_date).isoformat() if service_date else self.today.isoformat()
        if note:
            raw["notes"] = note[:300]
        updated = self._enrich(raw).as_dict()
        self._activity(
            state,
            "agent",
            "recorded_confirmed_service",
            f"{updated['name']} is next due {updated['next_due_date']}.",
        )
        self._write(state)
        return updated

    def add_item(
        self,
        *,
        name: str,
        interval_days: int,
        confirmed_by_human: bool,
        category: str = "Home",
        last_service_date: str | None = None,
        estimated_minutes: int = 20,
        notes: str = "",
    ) -> dict[str, Any]:
        if not confirmed_by_human:
            raise PermissionError("Explicit human confirmation is required before adding a responsibility.")
        if not name.strip():
            raise ValueError("name is required.")

        state = self._read()
        if any(item["name"].strip().lower() == name.strip().lower() for item in state["items"]):
            raise ValueError("A maintenance item with that name already exists.")

        raw = {
            "id": slugify(name),
            "name": name.strip()[:80],
            "category": category.strip()[:50] or "Home",
            "interval_days": max(1, min(int(interval_days), 3650)),
            "last_service_date": (
                parse_iso_date(last_service_date).isoformat()
                if last_service_date
                else self.today.isoformat()
            ),
            "estimated_minutes": max(5, min(int(estimated_minutes), 480)),
            "notes": notes[:300],
        }
        state["items"].append(raw)
        self._activity(
            state,
            "agent",
            "added_confirmed_item",
            f"Added {raw['name']} on a {raw['interval_days']}-day interval.",
        )
        self._write(state)
        return self._enrich(raw).as_dict()
