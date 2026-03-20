import os
import tempfile
from pathlib import Path
from typing import Any, Dict

from fpdf import FPDF


def generate_katahdin_form(animal: Dict[str, Any], output_dir: str | None = None) -> str:
    """
    Generate a simple registration-assist PDF for the current livestock record.
    """

    target_dir = Path(output_dir or tempfile.gettempdir())
    target_dir.mkdir(parents=True, exist_ok=True)
    animal_key = animal.get("tag_number") or animal.get("id") or "animal"
    file_path = target_dir / f"{animal_key}_registration.pdf"

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Katahdin Registration Worksheet", ln=True, align="C")
    pdf.ln(6)

    pdf.set_font("Arial", size=11)
    fields = [
        ("Animal ID", animal.get("tag_number") or animal.get("id") or ""),
        ("Registration Number", animal.get("registration_number") or ""),
        ("Birth Date", animal.get("date_of_birth") or ""),
        ("Birth Type", animal.get("birth_type") or ""),
        ("Breeding Type", animal.get("breeding_type") or ""),
        ("Sex", animal.get("sex") or ""),
        ("Breed", animal.get("animal_type") or "sheep"),
        ("Sire", animal.get("sire_name") or animal.get("sire_tag") or ""),
        ("Dam", animal.get("dam_name") or animal.get("dam_tag") or ""),
        ("Bloodline", animal.get("bloodline") or ""),
        ("Flock ID", animal.get("flock_id") or ""),
    ]

    for label, value in fields:
        pdf.cell(60, 9, f"{label}:", border=0)
        pdf.multi_cell(0, 9, str(value))

    pdf.ln(4)
    pdf.set_font("Arial", "I", 10)
    pdf.multi_cell(
        0,
        7,
        "Review this worksheet against the official Katahdin Hair Sheep International registry requirements before submission.",
    )

    pdf.output(str(file_path))
    return os.fspath(file_path)
