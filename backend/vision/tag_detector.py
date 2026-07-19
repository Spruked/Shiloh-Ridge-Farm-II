from typing import Any, Dict, List

import numpy as np

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None


class EarTagDetector:
    def extract_tag_roi(self, image: np.ndarray) -> List[np.ndarray]:
        if image is None or getattr(image, "size", 0) == 0:
            return []
        if cv2 is None:
            return [image]

        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        yellow = cv2.inRange(hsv, (15, 40, 40), (45, 255, 255))
        contours, _ = cv2.findContours(yellow, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        rois: List[np.ndarray] = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w * h >= 100:
                rois.append(image[y : y + h, x : x + w])
        return rois or [image]

    def read_tag(self, image: np.ndarray) -> Dict[str, Any]:
        return {
            "number": None,
            "confidence": 0.0,
            "color": None,
            "regions": len(self.extract_tag_roi(image)),
        }
