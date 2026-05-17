"""
cali_shep_bridge.py
===================
This lives in CALI's mesh, NOT in Shep.
Shep never sees this file.
"""

from pathlib import Path

from shep_worker.job.knowledge_updater import ShepKnowledgeUpdater
from shep_worker.job.learning_logger import ShepLearningLogger


class CaliShepBridge:
    """
    CALI ORB's interface to Shep's learning pipeline.
    CALI has mesh. CALI has tribunal. CALI prepares drafts.
    Shep does not.
    """

    def __init__(self, shep_root: Path):
        self.logger = ShepLearningLogger(shep_root)
        self.updater = ShepKnowledgeUpdater(shep_root)

    def fetch_pending_learning(self, limit: int = 50):
        """CALI pulls Shep's unknown questions."""
        return self.logger.get_pending_items(limit)

    def submit_draft_answer(
        self, learning_item: dict, draft_answer: str, cali_reasoning: str
    ):
        """
        CALI uses mesh/tribunal/substrate to prepare a draft.
        Writes to shep_approved.jsonl with status pending_human_review.
        """
        draft = {
            "id": learning_item["id"],
            "normalized_query": learning_item["normalized_query"],
            "raw_query": learning_item["raw_query"],
            "draft_answer": draft_answer,
            "cali_notes": cali_reasoning,
            "source_tags": learning_item.get("tags", []),
        }
        self.updater.submit_for_approval(draft)

        # Mark as under review in learning log
        self.logger.update_status(
            learning_item["id"],
            "under_cali_review",
            {"actor": "cali_orb", "note": "Draft submitted for human approval"},
        )

    def human_approves(self, item_id: str, final_answer: str, reviewer: str, notes: str = ""):
        """Human reviewer gives final approval."""
        self.updater.human_approve(item_id, final_answer, reviewer, notes)
        self.logger.update_status(
            item_id,
            "approved_ingested",
            {"actor": reviewer, "note": notes or "Human approved"},
        )

    def human_rejects(self, item_id: str, reason: str, reviewer: str):
        """Human reviewer rejects."""
        self.updater.human_reject(item_id, reason, reviewer)
        self.logger.update_status(
            item_id,
            "human_rejected",
            {"actor": reviewer, "note": reason},
        )
