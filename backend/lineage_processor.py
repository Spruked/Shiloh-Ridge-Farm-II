import re
from typing import Any, Dict

import numpy as np
from vision.form_aligner import DocumentAligner


try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None

try:
    import pytesseract  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    pytesseract = None

aligner = DocumentAligner()


def extract_anchored_fields(aligned_img: np.ndarray, text: str) -> Dict[str, Any]:
    """
    Extract key registry fields from approximate form zones instead of relying
    only on whole-document regex scans.
    """

    # Always return the full lineage shell, even if OCR misses or dependencies
    # are unavailable.
    results: Dict[str, Any] = {
        "sire": None,
        "sire_id": None,
        "sire_reg": None,
        "dam": None,
        "dam_id": None,
        "dam_reg": None,
        "dob": None,
    }

    if aligned_img is None:
        return results

    shape = getattr(aligned_img, "shape", None)
    if not shape or len(shape) < 2:
        return results

    working = aligned_img
    if len(shape) == 2 and cv2 is not None:
        working = cv2.cvtColor(aligned_img, cv2.COLOR_GRAY2BGR)

    height, width = working.shape[:2]
    regions = {
        "sire": working[int(height * 0.35):int(height * 0.55), int(width * 0.5):width],
        "dam": working[int(height * 0.55):int(height * 0.75), int(width * 0.5):width],
        "dob": working[int(height * 0.25):int(height * 0.40), int(width * 0.2):int(width * 0.5)],
    }

    for key, region in regions.items():
        if region.size == 0 or pytesseract is None:
            continue

        ocr_input = region
        if cv2 is not None:
            if len(getattr(region, "shape", [])) == 3:
                ocr_input = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            ocr_input = cv2.threshold(ocr_input, 150, 255, cv2.THRESH_BINARY)[1]

        try:
            region_text = pytesseract.image_to_string(ocr_input, config="--psm 6")
        except Exception:
            region_text = ""

        if key == "dob":
            match = re.search(r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}", region_text)
            if match:
                results["dob"] = match.group(0)
        else:
            match = re.search(r"([A-Z]{1,3}\s?\d{1,4})", region_text)
            if match:
                results[key] = match.group(1)

    # Fallback to full-document text for anything still missing.
    if text:
        if not results["dob"]:
            dob_match = re.search(r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})", text)
            if dob_match:
                results["dob"] = dob_match.group(1)

        if not results["sire"]:
            sire_match = re.search(r"Sire.*?([A-Za-z0-9][A-Za-z0-9\s-]{1,40})", text, re.IGNORECASE)
            if sire_match:
                results["sire"] = sire_match.group(1).strip()

        if not results["dam"]:
            dam_match = re.search(r"Dam.*?([A-Za-z0-9][A-Za-z0-9\s-]{1,40})", text, re.IGNORECASE)
            if dam_match:
                results["dam"] = dam_match.group(1).strip()

        if not results["sire_reg"]:
            sire_reg = re.search(r"Sire\s*KHSI\s*Reg#?\s*[:\-]?\s*([A-Za-z0-9-]+)", text, re.IGNORECASE)
            if sire_reg:
                results["sire_reg"] = sire_reg.group(1).strip()

        if not results["dam_reg"]:
            dam_reg = re.search(r"Dam\s*KHSI\s*Reg#?\s*[:\-]?\s*([A-Za-z0-9-]+)", text, re.IGNORECASE)
            if dam_reg:
                results["dam_reg"] = dam_reg.group(1).strip()

        if not results["sire_id"]:
            sire_id = re.search(r"Sire\s*ID\s*[:\-]?\s*([A-Za-z0-9-]+)", text, re.IGNORECASE)
            if sire_id:
                results["sire_id"] = sire_id.group(1).strip()

        if not results["dam_id"]:
            dam_id = re.search(r"Dam\s*ID\s*[:\-]?\s*([A-Za-z0-9-]+)", text, re.IGNORECASE)
            if dam_id:
                results["dam_id"] = dam_id.group(1).strip()

    return results


async def extract_lineage_from_document(image_bytes: bytes) -> Dict[str, Any]:
    """
    Extract lineage data from scanned registry paperwork.

    This is intentionally defensive: if OCR tooling is unavailable in the
    current environment, it returns an empty result instead of breaking the
    full capture pipeline.
    """

    if not image_bytes or cv2 is None or pytesseract is None:
        return {}

    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return {}

    aligned = aligner.align(image)
    gray = aligned if len(getattr(aligned, "shape", [])) == 2 else cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY)
    gray = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]
    text = pytesseract.image_to_string(gray)
    anchored = extract_anchored_fields(aligned, text)

    data: Dict[str, Any] = {}

    id_match = re.search(r"(?:Tag|ID|Animal ID)[^\dA-Z]*(\d+)", text, re.IGNORECASE)
    if id_match:
        data["sheep_id"] = id_match.group(1)

    dob_match = re.search(r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})", text)
    if dob_match:
        data["dob"] = dob_match.group(1)

    sire_match = re.search(r"Sire.*?([A-Za-z0-9][A-Za-z0-9\s-]{1,40})", text, re.IGNORECASE)
    dam_match = re.search(r"Dam.*?([A-Za-z0-9][A-Za-z0-9\s-]{1,40})", text, re.IGNORECASE)
    if sire_match:
        data["sire"] = sire_match.group(1).strip()
    if dam_match:
        data["dam"] = dam_match.group(1).strip()

    reg_match = re.search(r"Reg(?:istration)?[^\d]*(\d+)", text, re.IGNORECASE)
    if reg_match:
        data["registration_number"] = reg_match.group(1)

    data.update({key: value for key, value in anchored.items() if value})

    confidence_signals = sum(
        1 for key in ("sheep_id", "dob", "sire", "dam", "registration_number") if data.get(key)
    )
    extracted_confidence = min(1.0, 0.2 * confidence_signals)
    doc_confidence = 0.9 if len(text) > 50 else 0.5
    data["confidence"] = extracted_confidence
    data["doc_confidence"] = doc_confidence

    return data
