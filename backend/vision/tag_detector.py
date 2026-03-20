from typing import Dict, List, Optional, Tuple

import numpy as np


try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None

try:
    import pytesseract  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    pytesseract = None


class EarTagDetector:
    """
    Detect likely ear-tag regions using color heuristics and OCR only those ROIs.
    """

    def __init__(self):
        self.color_ranges = {
            "yellow": ([20, 100, 100], [30, 255, 255]),
            "blue": ([100, 150, 0], [140, 255, 255]),
            "orange": ([10, 100, 100], [20, 255, 255]),
            "green": ([40, 100, 100], [80, 255, 255]),
        }

    def extract_tag_roi(self, image: np.ndarray) -> List[Tuple[int, int, int, int, str]]:
        if cv2 is None or image is None or image.size == 0:
            return []

        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        regions: List[Tuple[int, int, int, int, str]] = []

        for color, (lower, upper) in self.color_ranges.items():
            mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                aspect = w / float(h or 1)
                if 1.5 < aspect < 4.0 and w > 20 and h > 10:
                    padding = 10
                    x1 = max(0, x - padding)
                    y1 = max(0, y - padding)
                    x2 = min(image.shape[1], x + w + padding)
                    y2 = min(image.shape[0], y + h + padding)
                    regions.append((x1, y1, x2 - x1, y2 - y1, color))

        regions.sort(key=lambda region: region[2] * region[3], reverse=True)
        return regions[:3]

    def read_tag(self, image: np.ndarray) -> Dict[str, Optional[object]]:
        if image is None or image.size == 0:
            return {"number": None, "confidence": 0.0, "color": None, "roi": None}

        if cv2 is None or pytesseract is None:
            return {"number": None, "confidence": 0.0, "color": None, "roi": None}

        rois = self.extract_tag_roi(image)
        for x, y, w, h, color in rois:
            roi = image[y:y + h, x:x + w]
            if roi.size == 0:
                continue

            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            text = pytesseract.image_to_string(
                thresh,
                config="--psm 7 -c tessedit_char_whitelist=0123456789",
            ).strip()
            if text.isdigit() and 2 < len(text) < 6:
                return {
                    "number": text,
                    "color": color,
                    "confidence": self._calculate_confidence(thresh, text),
                    "roi": (x, y, w, h),
                }

        return {"number": None, "confidence": 0.0, "color": None, "roi": None}

    def _calculate_confidence(self, processed_image: np.ndarray, text: str) -> float:
        if cv2 is None:
            return 0.0

        lap_var = cv2.Laplacian(processed_image, cv2.CV_64F).var()
        blur_score = min(lap_var / 500.0, 1.0)
        len_score = 1.0 if len(text) in [3, 4] else 0.7
        return round((blur_score * 0.6) + (len_score * 0.4), 3)
