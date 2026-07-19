import re
import uuid
from pathlib import Path
from typing import Dict

from .learning_logger import ShepLearningLogger


class ShepVisitorAssistant:
    def __init__(self, shep_root: str):
        self.shep_root = Path(shep_root)
        self.logger = ShepLearningLogger(self.shep_root)

    def reload_knowledge(self) -> None:
        return None

    def ask(self, text: str, page: str = "/", session_id: str = "") -> Dict[str, str]:
        normalized = re.sub(r"\s+", " ", (text or "").lower()).strip()

        if any(term in normalized for term in ["where", "located", "address", "location"]):
            return {
                "status": "known",
                "text": "Shiloh Ridge Katahdins is located at 20705 Quebec Road, Maitland, Missouri 64466.",
            }

        if "katahdin" in normalized:
            return {
                "status": "known",
                "text": "Katahdin sheep are a low-maintenance hair breed known for shedding naturally, strong parasite resistance, and mild lamb.",
            }

        if any(term in normalized for term in ["cut", "cuts", "butcher", "processing", "freezer"]):
            return {
                "status": "known",
                "text": "Butch handles meat cuts, freezer space, and processing questions. Open Butch on the Products page for the best answer.",
            }

        learning_id = f"learn_{uuid.uuid4().hex[:10]}"
        self.logger.log_unknown(learning_id, text, normalized, session_id, page)
        return {
            "status": "learning_logged",
            "text": "I do not have that farm answer yet, but I logged it for review.",
        }
