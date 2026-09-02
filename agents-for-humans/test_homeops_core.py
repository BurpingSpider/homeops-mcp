import tempfile
import unittest
from datetime import date
from pathlib import Path

from homeops_core import HomeOpsStore


class HomeOpsStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "homeops.json"
        self.store = HomeOpsStore(self.path, today=date(2026, 9, 2))

    def tearDown(self):
        self.tmp.cleanup()

    def test_audit_due_sorts_by_urgency(self):
        items = self.store.audit_due(30)
        self.assertGreaterEqual(len(items), 3)
        remaining = [item["days_remaining"] for item in items]
        self.assertEqual(remaining, sorted(remaining))

    def test_proposal_respects_time_budget_and_waits_for_human(self):
        proposal = self.store.propose_session(horizon_days=30, limit=3, max_minutes=50)
        self.assertEqual(proposal["status"], "pending_human_review")
        self.assertLessEqual(proposal["estimated_total_minutes"], 50)
        self.assertGreaterEqual(len(proposal["tasks"]), 1)

    def test_human_decision_is_persisted(self):
        self.store.propose_session(horizon_days=30, limit=2, max_minutes=60)
        decision = self.store.set_proposal_decision(
            decision="revision_requested",
            note="Do the two shortest tasks first.",
        )
        self.assertEqual(decision["status"], "revision_requested")
        self.assertEqual(self.store.get_proposal_status()["human_note"], "Do the two shortest tasks first.")

    def test_record_service_requires_confirmation(self):
        with self.assertRaises(PermissionError):
            self.store.record_service(name="HVAC filter", confirmed_by_human=False)

    def test_record_service_updates_next_due(self):
        updated = self.store.record_service(
            name="HVAC filter",
            confirmed_by_human=True,
            service_date="2026-09-02",
        )
        self.assertEqual(updated["last_service_date"], "2026-09-02")
        self.assertEqual(updated["next_due_date"], "2026-12-01")

    def test_add_item_requires_confirmation_and_rejects_duplicate(self):
        with self.assertRaises(PermissionError):
            self.store.add_item(name="Roof inspection", interval_days=365, confirmed_by_human=False)

        created = self.store.add_item(
            name="Roof inspection",
            interval_days=365,
            confirmed_by_human=True,
            category="Exterior",
        )
        self.assertEqual(created["name"], "Roof inspection")
        with self.assertRaises(ValueError):
            self.store.add_item(
                name="Roof inspection",
                interval_days=365,
                confirmed_by_human=True,
            )


if __name__ == "__main__":
    unittest.main()
