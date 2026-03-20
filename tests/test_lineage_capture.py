import asyncio
import os
import sys
import tempfile


import numpy as np

os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
sys.path.insert(0, os.path.abspath("backend"))

from capture_confidence import ConfidenceEngine  # noqa: E402
import lineage_processor  # noqa: E402
from lineage_processor import extract_anchored_fields, extract_lineage_from_document  # noqa: E402
import mobile_capture  # noqa: E402
from mobile_capture import auto_correct_tag_number, detect_tag_regions, extract_tag_number, flag_for_review, infer_from_size, parse_farmer_speech  # noqa: E402
from registration_generator import generate_katahdin_form  # noqa: E402
from vision.form_aligner import DocumentAligner  # noqa: E402
from vision.tag_detector import EarTagDetector, cv2 as detector_cv2  # noqa: E402


def test_auto_correct_tag_number():
    assert auto_correct_tag_number("O1BS") == "0185"


def test_parse_farmer_speech():
    parsed = parse_farmer_speech("Twin ewe born 03/03/2024 sire was Big Red 82 and 85 pounds")
    assert parsed["birth_type"] == "Tw"
    assert parsed["sex"] == "Ewe"
    assert parsed["date"] == "03/03/2024"
    assert parsed["sire"] == "Big Red 82"


def test_infer_from_size_returns_date_string():
    inferred = infer_from_size(35)
    assert isinstance(inferred, str)
    assert len(inferred.split("-")) == 3


def test_flag_for_review():
    flags = flag_for_review(
        {
            "ai_confidence": 0.4,
            "estimated_weight_kg": 120,
            "body_condition_score": 1.5,
            "registration_number": None,
        }
    )
    assert "Low confidence in auto-detection" in flags
    assert "Unusually heavy - verify weight" in flags
    assert "Animal appears thin - health check recommended" in flags
    assert "Registration number missing from current capture" in flags


def test_detect_tag_regions_returns_crops_and_fallback():
    image = np.zeros((600, 800, 3), dtype=np.uint8)
    regions = detect_tag_regions(image)
    assert len(regions) >= 3
    assert all(region.shape[0] > 0 for region in regions)
    assert all(region.shape[1] > 0 for region in regions)


def test_detect_tag_regions_small_image_falls_back_to_full_image():
    image = np.zeros((100, 150, 3), dtype=np.uint8)
    regions = detect_tag_regions(image)
    assert len(regions) == 1
    assert regions[0].shape == image.shape


def test_confidence_threshold_requires_review():
    engine = ConfidenceEngine()
    score = engine.score_capture(
        {"number": "042", "confidence": 0.5},
        {"confidence": 0.9},
        {"confidence": 0.95},
    )
    assert score.requires_review is True
    assert any("Tag confidence" in reason for reason in score.review_reasons)


def test_form_aligner_returns_image_shape():
    image = np.zeros((120, 200, 3), dtype=np.uint8)
    aligner = DocumentAligner()
    aligned = aligner.align(image)
    assert aligned is not None


def test_tag_detector_extracts_candidate_roi():
    if detector_cv2 is None:
        return

    image = np.zeros((200, 300, 3), dtype=np.uint8)
    detector_cv2.rectangle(image, (40, 60), (140, 100), (0, 255, 255), -1)
    detector = EarTagDetector()
    rois = detector.extract_tag_roi(image)
    assert len(rois) >= 1


def test_tag_zone_extraction(monkeypatch):
    if detector_cv2 is None:
        return

    image = np.zeros((600, 800, 3), dtype=np.uint8)
    detector_cv2.rectangle(image, (50, 100), (150, 180), (255, 255, 255), -1)
    detector_cv2.putText(image, "042", (60, 155), detector_cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 3)

    class FakeTesseract:
        @staticmethod
        def image_to_string(*args, **kwargs):
            return "042"

    monkeypatch.setattr(mobile_capture, "pytesseract", FakeTesseract())

    regions = detect_tag_regions(image)
    assert len(regions) >= 2

    tag, confidence = extract_tag_number(image)
    assert tag == "042"
    assert confidence > 0.5


def test_low_confidence_fallback(monkeypatch):
    class FakeTesseract:
        @staticmethod
        def image_to_string(*args, **kwargs):
            return "abc"

    monkeypatch.setattr(mobile_capture, "pytesseract", FakeTesseract())

    noise = np.zeros((400, 600, 3), dtype=np.uint8)
    tag, confidence = extract_tag_number(noise)
    assert tag is None or confidence < 0.5


def test_extract_lineage_from_document_fails_safe_without_image():
    result = asyncio.run(extract_lineage_from_document(b""))
    assert result == {}


def test_extract_anchored_fields_returns_expected_matches(monkeypatch):
    class FakeTesseract:
        calls = 0

        @classmethod
        def image_to_string(cls, *args, **kwargs):
            cls.calls += 1
            if cls.calls == 1:
                return "BR 82"
            if cls.calls == 2:
                return "ML 14"
            return "03/03/2024"

    monkeypatch.setattr(lineage_processor, "pytesseract", FakeTesseract)

    image = np.zeros((600, 800, 3), dtype=np.uint8)
    anchored = extract_anchored_fields(image, "")
    assert anchored["sire"] == "BR 82"
    assert anchored["dam"] == "ML 14"
    assert anchored["dob"] == "03/03/2024"


def test_generate_katahdin_form_creates_pdf():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = generate_katahdin_form(
            {
                "id": "animal-1",
                "tag_number": "042",
                "date_of_birth": "2024-03-03",
                "sire_name": "Big Red",
                "dam_name": "Molly",
                "birth_type": "Tw",
                "registration_number": "KHSI-042",
            },
            output_dir=tmpdir,
        )
        assert os.path.exists(path)
        assert path.endswith(".pdf")
