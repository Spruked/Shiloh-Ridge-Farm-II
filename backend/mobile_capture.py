import base64
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth import verify_token
from capture_confidence import ConfidenceEngine
from lineage_processor import extract_lineage_from_document
from registration_generator import generate_katahdin_form
from vision.tag_detector import EarTagDetector


try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None

try:
    import pytesseract  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    pytesseract = None


router = APIRouter(tags=["mobile-capture"])
db = None
ROOT_DIR = Path(__file__).parent
tag_detector = EarTagDetector()
confidence_engine = ConfidenceEngine()


def set_mobile_capture_db(database):
    global db
    db = database


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def auto_correct_tag_number(raw_tag: str) -> str:
    corrections = {"O": "0", "I": "1", "L": "1", "B": "8", "S": "5"}
    corrected = []
    for char in (raw_tag or "").upper():
        corrected.append(corrections.get(char, char))
    return "".join(corrected)


def generate_temp_id() -> str:
    return f"TEMP-{uuid.uuid4().hex[:8].upper()}"


def infer_from_size(estimated_weight: Optional[float]) -> str:
    if not estimated_weight:
        return (utc_now() - timedelta(days=180)).date().isoformat()

    if estimated_weight < 25:
        age_days = 45
    elif estimated_weight < 45:
        age_days = 90
    elif estimated_weight < 70:
        age_days = 150
    else:
        age_days = 240
    return (utc_now() - timedelta(days=age_days)).date().isoformat()


def normalize_birth_type(text: Optional[str]) -> Optional[str]:
    mapping = {
        "single": "Sg",
        "sg": "Sg",
        "twin": "Tw",
        "tw": "Tw",
        "triplet": "Tr",
        "tr": "Tr",
        "natural": "Nat",
        "nat": "Nat",
    }
    if not text:
        return None
    return mapping.get(text.lower(), text)


def parse_farmer_speech(text: Optional[str]) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    if not text:
        return data

    lowered = text.lower()
    if "twin" in lowered:
        data["birth_type"] = "Tw"
    elif "single" in lowered or "sg" in lowered:
        data["birth_type"] = "Sg"
    elif "triplet" in lowered:
        data["birth_type"] = "Tr"

    if "ewe" in lowered or "female" in lowered:
        data["sex"] = "Ewe"
    elif "ram" in lowered or "male" in lowered:
        data["sex"] = "Ram"

    date_match = re.search(r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})", text)
    if date_match:
        data["date"] = date_match.group(1)

    sire_match = re.search(
        r"sire(?: was| is)?\s+([a-z0-9][a-z0-9\s-]*?)(?:\s+(?:dam|born|weight|weigh|and)\b|$|,|\.)",
        lowered,
    )
    dam_match = re.search(
        r"dam(?: was| is)?\s+([a-z0-9][a-z0-9\s-]*?)(?:\s+(?:sire|born|weight|weigh|and)\b|$|,|\.)",
        lowered,
    )
    if sire_match:
        data["sire"] = sire_match.group(1).strip().title()
    if dam_match:
        data["dam"] = dam_match.group(1).strip().title()

    weight_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds|kg|kgs)", lowered)
    if weight_match:
        data["weight"] = float(weight_match.group(1))

    return data


def infer_missing_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    defaults = {
        "animal_type": "sheep",
        "birth_type": "Unk",
        "date_of_birth": infer_from_size(record.get("estimated_weight_kg")),
        "sex": "Ewe",
    }
    for key, default in defaults.items():
        if not record.get(key):
            record[key] = default
    return record


def flag_for_review(record: Dict[str, Any]) -> List[str]:
    warnings: List[str] = []
    if (record.get("ai_confidence") or 0) < 0.6:
        warnings.append("Low confidence in auto-detection")
    if (record.get("estimated_weight_kg") or 0) > 100:
        warnings.append("Unusually heavy - verify weight")
    if record.get("body_condition_score") is not None and record.get("body_condition_score", 3) < 2:
        warnings.append("Animal appears thin - health check recommended")
    if not record.get("registration_number"):
        warnings.append("Registration number missing from current capture")
    return warnings


async def extract_from_image(image_bytes: bytes) -> Dict[str, Any]:
    if not image_bytes or cv2 is None:
        return {"confidence": 0.0}

    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return {"confidence": 0.0}

    results: Dict[str, Any] = {
        "confidence": 0.45,
        "breed": "Katahdin",
        "tag_number": None,
        "tag_confidence": 0.0,
        "tag_color": None,
        "tag_region": "none",
        "needs_review": False,
    }

    height, width = image.shape[:2]
    pixel_height = float(height)
    results["estimated_weight"] = round(max(20.0, min(120.0, pixel_height / 18)), 1)
    results["condition_score"] = 3.0

    tag_result = tag_detector.read_tag(image)
    if tag_result.get("number") and float(tag_result.get("confidence", 0.0)) > 0.7:
        results["tag_number"] = auto_correct_tag_number(str(tag_result["number"]))
        results["tag_confidence"] = float(tag_result["confidence"])
        results["tag_color"] = tag_result.get("color")
        results["confidence"] = max(0.7, float(tag_result["confidence"]))
        results["tag_region"] = "ear_zone"
    else:
        tag_number, tag_confidence = extract_tag_number(image)
        if tag_number:
            results["tag_number"] = auto_correct_tag_number(tag_number)
            results["tag_confidence"] = tag_confidence
            results["confidence"] = max(results["confidence"], tag_confidence)
            results["tag_region"] = "ear_zone" if tag_confidence >= 0.9 else "full_fallback"
        else:
            results["tag_region"] = "none"
            results["needs_review"] = True

    if results["tag_confidence"] < 0.7:
        results["needs_review"] = True

    return results


def detect_tag_regions(image: np.ndarray) -> List[np.ndarray]:
    """
    Crop likely ear-tag regions before OCR.

    Fallback is the original image so OCR still has a chance to run when the
    animal framing is unusual.
    """

    height, width = image.shape[:2]
    if height < 200 or width < 200:
        return [image]

    regions: List[np.ndarray] = []

    left_crop = image[int(height * 0.15):int(height * 0.55), 0:int(width * 0.35)]
    if left_crop.size > 0:
        regions.append(left_crop)

    right_crop = image[int(height * 0.15):int(height * 0.55), int(width * 0.65):width]
    if right_crop.size > 0:
        regions.append(right_crop)

    center_crop = image[int(height * 0.10):int(height * 0.40), int(width * 0.30):int(width * 0.70)]
    if center_crop.size > 0:
        regions.append(center_crop)

    return regions if regions else [image]


def preprocess_for_ocr(region: np.ndarray) -> np.ndarray:
    """Aggressively clean likely tag regions before OCR."""

    if len(region.shape) == 3:
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    else:
        gray = region

    scaled = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    denoised = cv2.fastNlMeansDenoising(scaled, None, 10, 7, 21)
    binary = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,
        2,
    )
    kernel = np.ones((2, 2), np.uint8)
    return cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)


def extract_tag_number(image: np.ndarray) -> Tuple[Optional[str], float]:
    """Crop candidate regions, OCR them, and return the best tag guess."""

    if pytesseract is None or cv2 is None:
        return None, 0.0

    regions = detect_tag_regions(image)
    candidates: List[Tuple[str, float, int]] = []

    for idx, region in enumerate(regions):
        processed = preprocess_for_ocr(region)
        text = pytesseract.image_to_string(
            processed,
            config="--psm 7 --oem 3 -c tessedit_char_whitelist=0123456789",
        )
        cleaned = "".join(filter(str.isdigit, text or ""))

        if cleaned:
            if 3 <= len(cleaned) <= 4:
                score = 0.9
            elif len(cleaned) == 5:
                score = 0.7
            else:
                score = 0.4

            if idx < 2:
                score += 0.05

            candidates.append((cleaned, min(score, 1.0), idx))

    if candidates:
        candidates.sort(key=lambda item: item[1], reverse=True)
        best_tag, best_score, _ = candidates[0]
        return best_tag, best_score

    full_text = pytesseract.image_to_string(
        image,
        config="--psm 6 -c tessedit_char_whitelist=0123456789",
    )
    full_cleaned = "".join(filter(str.isdigit, full_text or ""))
    if full_cleaned and 3 <= len(full_cleaned) <= 5:
        return full_cleaned, 0.5

    return None, 0.0


def save_to_storage(file_bytes: bytes, folder: str, filename: str) -> str:
    target_dir = ROOT_DIR / "documents" / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / filename
    with open(target_path, "wb") as handle:
        handle.write(file_bytes)
    return f"documents/{folder}/{filename}"


@router.get("/capture/health")
async def capture_health():
    return {
        "status": "healthy",
        "database_configured": db is not None,
        "opencv_available": cv2 is not None,
        "ocr_available": pytesseract is not None,
    }


@router.post("/capture/process")
async def process_capture(
    image: UploadFile = File(...),
    document: Optional[UploadFile] = File(None),
    gps_lat: Optional[float] = Form(None),
    gps_lon: Optional[float] = Form(None),
    voice_note: Optional[str] = Form(None),
    username: str = Depends(verify_token),
):
    if db is None:
        raise HTTPException(status_code=500, detail="Capture database is not configured")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Capture image is required")

    image_filename = f"{uuid.uuid4().hex}_{image.filename or 'capture.jpg'}"
    image_path = save_to_storage(image_bytes, "livestock_captures", image_filename)

    cv_results = await extract_from_image(image_bytes)
    voice_data = parse_farmer_speech(voice_note)

    lineage_data: Dict[str, Any] = {}
    document_path = None
    if document is not None:
        document_bytes = await document.read()
        if document_bytes:
            document_filename = f"{uuid.uuid4().hex}_{document.filename or 'lineage_scan.jpg'}"
            document_path = save_to_storage(document_bytes, "lineage_scans", document_filename)
            lineage_data = await extract_lineage_from_document(document_bytes)

    if lineage_data.get("sheep_id"):
        sheep_id = lineage_data["sheep_id"]
        id_source = "document"
    elif cv_results.get("tag_number") and float(cv_results.get("tag_confidence", 0.0)) >= 0.75:
        sheep_id = cv_results["tag_number"]
        id_source = "tag_ocr"
    else:
        sheep_id = generate_temp_id()
        id_source = "temp_pending"
    sheep_id = auto_correct_tag_number(str(sheep_id))

    capture_record: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "animal_type": "sheep",
        "tag_number": sheep_id,
        "birth_type": normalize_birth_type(lineage_data.get("birth_type") or voice_data.get("birth_type")),
        "date_of_birth": lineage_data.get("dob") or voice_data.get("date") or infer_from_size(cv_results.get("estimated_weight")),
        "sex": voice_data.get("sex") or cv_results.get("sex") or "Ewe",
        "sire_name": lineage_data.get("sire") or voice_data.get("sire"),
        "dam_name": lineage_data.get("dam") or voice_data.get("dam"),
        "registration_number": lineage_data.get("registration_number"),
        "weight": voice_data.get("weight") or cv_results.get("estimated_weight"),
        "status": "available",
        "photos": [image_path],
        "capture_photo_url": image_path,
        "capture_document_url": document_path,
        "capture_gps": f"{gps_lat},{gps_lon}" if gps_lat is not None and gps_lon is not None else None,
        "capture_timestamp": utc_now().isoformat(),
        "capture_device": "mobile_pwa",
        "capture_tag_region": cv_results.get("tag_region"),
        "id_source": id_source,
        "ai_confidence": float(cv_results.get("confidence", 0.0)),
        "body_condition_score": cv_results.get("condition_score"),
        "estimated_weight_kg": cv_results.get("estimated_weight"),
        "uploaded_by": username,
        "created_at": utc_now().isoformat(),
        "updated_at": utc_now().isoformat(),
    }

    infer_missing_fields(capture_record)

    voice_score = {
        "confidence": 0.85 if voice_data else 1.0,
        "parsed_fields": list(voice_data.keys()),
    }
    tag_score = {
        "number": cv_results.get("tag_number"),
        "confidence": cv_results.get("tag_confidence", 0.0),
    }
    score = confidence_engine.score_capture(tag_score, lineage_data, voice_score)
    review_flags = flag_for_review(capture_record)
    review_flags.extend(score.review_reasons)
    capture_record["review_flags"] = list(dict.fromkeys(review_flags))
    capture_record["capture_confidence"] = score.overall
    capture_record["requires_review"] = score.requires_review or len(capture_record["review_flags"]) > 0
    capture_record["review_reasons"] = capture_record["review_flags"]
    capture_record["tag_confidence"] = cv_results.get("tag_confidence")
    capture_record["tag_color"] = cv_results.get("tag_color")
    capture_record["status"] = "pending_review" if capture_record["requires_review"] else "available"

    await db.livestock.insert_one(capture_record)

    return {
        "success": True,
        "record_id": capture_record["id"],
        "sheep_id": capture_record["tag_number"],
        "id_source": id_source,
        "extracted_data": {
            "tag": cv_results.get("tag_number"),
            "tag_color": cv_results.get("tag_color"),
            "tag_region": cv_results.get("tag_region"),
            "breed": cv_results.get("breed", "Katahdin"),
            "condition": cv_results.get("condition_score"),
            "lineage": lineage_data,
        },
        "confidence": score.overall,
        "requires_review": capture_record["requires_review"],
        "review_flags": capture_record["review_flags"],
    }


@router.post("/capture/register/{animal_id}")
async def register_animal(animal_id: str, username: str = Depends(verify_token)):
    if db is None:
        raise HTTPException(status_code=500, detail="Capture database is not configured")

    animal = await db.livestock.find_one({"id": animal_id}, {"_id": 0})
    if not animal:
        raise HTTPException(status_code=404, detail="Livestock not found")

    pdf_path = generate_katahdin_form(animal, output_dir=os.fspath(ROOT_DIR / "documents" / "generated"))
    return {
        "pdf": pdf_path,
        "registry_url": "https://katahdins.org/registry",
        "animal_id": animal_id,
        "generated_by": username,
    }


@router.get("/review/pending")
async def get_pending_reviews(username: str = Depends(verify_token)):
    if db is None:
        raise HTTPException(status_code=500, detail="Capture database is not configured")

    pending = await db.livestock.find(
        {"requires_review": True},
        {"_id": 0},
    ).sort("capture_timestamp", -1).to_list(200)

    return [
        {
            "id": record["id"],
            "temp_id": record.get("tag_number"),
            "photo_url": record.get("capture_photo_url"),
            "suggested_tag": record.get("tag_number") if (record.get("capture_confidence") or 0) < 0.5 else None,
            "confidence": record.get("capture_confidence"),
            "reasons": record.get("review_reasons") or [],
            "capture_gps": record.get("capture_gps"),
            "captured_at": record.get("capture_timestamp"),
        }
        for record in pending
    ]
