from dataclasses import dataclass
from typing import Dict, List


@dataclass
class CaptureScore:
    overall: float
    tag_read: float
    lineage_extract: float
    voice_parse: float
    requires_review: bool
    review_reasons: List[str]


class ConfidenceEngine:
    THRESHOLDS = {
        "tag_read": 0.75,
        "lineage_match": 0.80,
        "voice_confidence": 0.70,
        "overall": 0.75,
    }

    def score_capture(self, tag_result: Dict, lineage_result: Dict, voice_result: Dict) -> CaptureScore:
        scores = {
            "tag": float(tag_result.get("confidence", 0.0)),
            "lineage": float(lineage_result.get("confidence", 1.0) if lineage_result else 1.0),
            "voice": float(voice_result.get("confidence", 1.0) if voice_result else 1.0),
        }

        overall = (scores["tag"] * 0.5) + (scores["lineage"] * 0.3) + (scores["voice"] * 0.2)
        review_reasons: List[str] = []

        if scores["tag"] < self.THRESHOLDS["tag_read"]:
            review_reasons.append(f"Tag confidence {scores['tag']:.2f} below threshold")
        if lineage_result and scores["lineage"] < self.THRESHOLDS["lineage_match"]:
            review_reasons.append("Lineage extraction uncertain")
        if voice_result and scores["voice"] < self.THRESHOLDS["voice_confidence"]:
            review_reasons.append("Voice parsing unclear")
        if tag_result.get("number") and not self._validate_tag_format(str(tag_result["number"])):
            review_reasons.append("Tag format unusual")
            overall *= 0.8

        return CaptureScore(
            overall=round(overall, 3),
            tag_read=scores["tag"],
            lineage_extract=scores["lineage"],
            voice_parse=scores["voice"],
            requires_review=bool(review_reasons) or overall < self.THRESHOLDS["overall"],
            review_reasons=review_reasons,
        )

    def _validate_tag_format(self, tag: str) -> bool:
        if not tag.isdigit():
            return False
        return 100 <= int(tag) <= 9999
