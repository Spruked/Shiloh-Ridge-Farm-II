from fastapi import APIRouter, HTTPException, Depends, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from auth import verify_token
import csv
import io
from fastapi.responses import StreamingResponse
from fpdf import FPDF
import json

router = APIRouter(prefix="/inventory", tags=["inventory"])

# Database connection (will be injected)
db = None

def set_inventory_db(database):
    global db
    db = database

class LivestockInventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    animal_id: str  # Tag number or unique identifier
    animal_type: str  # sheep, hog, cattle, chicken, dog
    breed: str
    bloodline: str
    sex: str  # M, F, E (ewe), R (ram)
    birth_type: str  # Sg (single), Tw (twin), Tr (triplet), Nat (natural)
    date_of_birth: str
    registration_number: Optional[str] = None  # KHSI or internal
    sire_name: Optional[str] = None
    sire_tag: Optional[str] = None
    dam_name: Optional[str] = None
    dam_tag: Optional[str] = None
    current_weight: Optional[float] = None
    weight_unit: str = "lbs"  # lbs, kg
    status: str = "available"  # available, weaned, breeding, market, sold, archived
    health_records: List[Dict[str, Any]] = []  # JSON log of health events
    sale_price: Optional[float] = None
    estimated_value: Optional[float] = None
    blockchain_id: Optional[str] = None  # NFT/CertSig token ID
    location: Optional[str] = None  # pasture, barn, etc.
    notes: Optional[str] = None
    photos: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LivestockInventoryCreate(BaseModel):
    animal_id: str
    animal_type: str
    breed: str
    bloodline: str
    sex: str
    birth_type: str
    date_of_birth: str
    registration_number: Optional[str] = None
    sire_name: Optional[str] = None
    sire_tag: Optional[str] = None
    dam_name: Optional[str] = None
    dam_tag: Optional[str] = None
    current_weight: Optional[float] = None
    weight_unit: str = "lbs"
    status: str = "available"
    health_records: List[Dict[str, Any]] = []
    sale_price: Optional[float] = None
    estimated_value: Optional[float] = None
    blockchain_id: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    photos: List[str] = []

class HealthRecord(BaseModel):
    date: str
    type: str  # vaccination, treatment, checkup, injury, etc.
    description: str
    veterinarian: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

@router.post("/", response_model=LivestockInventory)
async def create_inventory_item(item: LivestockInventoryCreate, username: str = Depends(verify_token)):
    # Check if animal_id already exists
    existing = await db.livestock_inventory.find_one({"animal_id": item.animal_id})
    if existing:
        raise HTTPException(status_code=400, detail="Animal ID already exists")

    inventory_obj = LivestockInventory(**item.model_dump())
    doc = inventory_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()

    await db.livestock_inventory.insert_one(doc)
    return inventory_obj

@router.get("/", response_model=List[LivestockInventory])
async def get_inventory(
    animal_type: Optional[str] = None,
    status: Optional[str] = None,
    breed: Optional[str] = None,
    min_weight: Optional[float] = None,
    max_weight: Optional[float] = None,
    username: str = Depends(verify_token)
):
    query = {}

    if animal_type:
        query["animal_type"] = animal_type
    if status:
        query["status"] = status
    if breed:
        query["breed"] = breed
    if min_weight is not None or max_weight is not None:
        weight_query = {}
        if min_weight is not None:
            weight_query["$gte"] = min_weight
        if max_weight is not None:
            weight_query["$lte"] = max_weight
        query["current_weight"] = weight_query

    items = await db.livestock_inventory.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])

    return items

@router.get("/{item_id}", response_model=LivestockInventory)
async def get_inventory_item(item_id: str, username: str = Depends(verify_token)):
    item = await db.livestock_inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('updated_at'), str):
        item['updated_at'] = datetime.fromisoformat(item['updated_at'])

    return item

@router.put("/{item_id}", response_model=LivestockInventory)
async def update_inventory_item(item_id: str, item: LivestockInventoryCreate, username: str = Depends(verify_token)):
    existing = await db.livestock_inventory.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = item.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()

    await db.livestock_inventory.update_one({"id": item_id}, {"$set": update_data})

    updated = await db.livestock_inventory.find_one({"id": item_id}, {"_id": 0})
    if updated:
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        return updated
    else:
        raise HTTPException(status_code=404, detail="Inventory item not found after update")

@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str, username: str = Depends(verify_token)):
    result = await db.livestock_inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return {"message": "Inventory item deleted successfully"}

@router.post("/{item_id}/health")
async def add_health_record(item_id: str, record: HealthRecord, username: str = Depends(verify_token)):
    existing = await db.livestock_inventory.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    health_record = record.model_dump()
    health_record['id'] = str(uuid.uuid4())
    health_record['created_at'] = datetime.now(timezone.utc).isoformat()

    await db.livestock_inventory.update_one(
        {"id": item_id},
        {
            "$push": {"health_records": health_record},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )

    return {"message": "Health record added successfully", "record_id": health_record['id']}

@router.get("/stats/summary")
async def get_inventory_summary(username: str = Depends(verify_token)):
    pipeline = [
        {
            "$group": {
                "_id": {
                    "animal_type": "$animal_type",
                    "status": "$status"
                },
                "count": {"$sum": 1},
                "total_value": {"$sum": {"$ifNull": ["$estimated_value", 0]}},
                "avg_weight": {"$avg": "$current_weight"}
            }
        },
        {
            "$group": {
                "_id": "$_id.animal_type",
                "statuses": {
                    "$push": {
                        "status": "$_id.status",
                        "count": "$count",
                        "total_value": "$total_value",
                        "avg_weight": "$avg_weight"
                    }
                },
                "total_count": {"$sum": "$count"},
                "total_value": {"$sum": "$total_value"}
            }
        }
    ]

    summary = await db.livestock_inventory.aggregate(pipeline).to_list(100)
    return {"summary": summary}

@router.put("/{item_id}/status")
async def update_item_status(item_id: str, status: str, username: str = Depends(verify_token)):
    existing = await db.livestock_inventory.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    valid_statuses = ["available", "weaned", "breeding", "market", "sold", "archived"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    await db.livestock_inventory.update_one(
        {"id": item_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": f"Status updated to {status}"}

@router.get("/export/csv")
async def export_inventory_csv(
    animal_type: Optional[str] = None,
    status: Optional[str] = None,
    username: str = Depends(verify_token)
):
    """Export inventory data as CSV"""
    query = {}
    if animal_type:
        query["animal_type"] = animal_type
    if status:
        query["status"] = status

    items = await db.livestock_inventory.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Animal ID", "Type", "Breed", "Bloodline", "Sex", "Birth Type",
        "Date of Birth", "Registration", "Sire Name", "Dam Name",
        "Current Weight", "Weight Unit", "Status", "Sale Price",
        "Estimated Value", "Location", "Notes", "Created At"
    ])

    # Write data
    for item in items:
        writer.writerow([
            item.get("animal_id", ""),
            item.get("animal_type", ""),
            item.get("breed", ""),
            item.get("bloodline", ""),
            item.get("sex", ""),
            item.get("birth_type", ""),
            item.get("date_of_birth", ""),
            item.get("registration_number", ""),
            item.get("sire_name", ""),
            item.get("dam_name", ""),
            item.get("current_weight", ""),
            item.get("weight_unit", ""),
            item.get("status", ""),
            item.get("sale_price", ""),
            item.get("estimated_value", ""),
            item.get("location", ""),
            item.get("notes", ""),
            item.get("created_at", "").split("T")[0] if item.get("created_at") else ""
        ])

    output.seek(0)
    response = StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory_export.csv"}
    )
    return response

@router.get("/export/pdf")
async def export_inventory_pdf(
    animal_type: Optional[str] = None,
    status: Optional[str] = None,
    username: str = Depends(verify_token)
):
    """Export inventory data as PDF report"""
    query = {}
    if animal_type:
        query["animal_type"] = animal_type
    if status:
        query["status"] = status

    items = await db.livestock_inventory.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)

    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Shiloh Ridge Farm - Livestock Inventory Report", 0, 1, "C")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1, "C")
    pdf.ln(10)

    # Summary stats
    total_count = len(items)
    by_type = {}
    by_status = {}
    total_value = 0

    for item in items:
        animal_type = item.get("animal_type", "Unknown")
        status = item.get("status", "Unknown")
        value = item.get("estimated_value", 0) or 0

        by_type[animal_type] = by_type.get(animal_type, 0) + 1
        by_status[status] = by_status.get(status, 0) + 1
        total_value += value

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, f"Total Animals: {total_count}", 0, 1)
    pdf.cell(0, 10, f"Total Estimated Value: ${total_value:,.2f}", 0, 1)
    pdf.ln(5)

    # By type
    pdf.set_font("Arial", "B", 10)
    pdf.cell(0, 8, "By Animal Type:", 0, 1)
    pdf.set_font("Arial", "", 10)
    for animal_type, count in by_type.items():
        pdf.cell(0, 6, f"  {animal_type.title()}: {count}", 0, 1)

    pdf.ln(5)

    # By status
    pdf.set_font("Arial", "B", 10)
    pdf.cell(0, 8, "By Status:", 0, 1)
    pdf.set_font("Arial", "", 10)
    for status, count in by_status.items():
        pdf.cell(0, 6, f"  {status.title()}: {count}", 0, 1)

    pdf.ln(10)

    # Detailed table
    pdf.set_font("Arial", "B", 8)
    pdf.cell(25, 8, "Animal ID", 1)
    pdf.cell(20, 8, "Type", 1)
    pdf.cell(25, 8, "Breed", 1)
    pdf.cell(20, 8, "Sex", 1)
    pdf.cell(25, 8, "Status", 1)
    pdf.cell(25, 8, "Est. Value", 1)
    pdf.cell(0, 8, "Location", 1, 1)

    pdf.set_font("Arial", "", 8)
    for item in items[:50]:  # Limit to first 50 for PDF readability
        pdf.cell(25, 6, str(item.get("animal_id", ""))[:24], 1)
        pdf.cell(20, 6, str(item.get("animal_type", ""))[:19], 1)
        pdf.cell(25, 6, str(item.get("breed", ""))[:24], 1)
        pdf.cell(20, 6, str(item.get("sex", ""))[:19], 1)
        pdf.cell(25, 6, str(item.get("status", ""))[:24], 1)
        value = item.get("estimated_value", 0) or 0
        pdf.cell(25, 6, f"${value:,.0f}", 1)
        pdf.cell(0, 6, str(item.get("location", ""))[:30], 1, 1)

    if len(items) > 50:
        pdf.set_font("Arial", "I", 8)
        pdf.cell(0, 6, f"... and {len(items) - 50} more animals", 0, 1)

    # Create response
    pdf_output = io.BytesIO()
    pdf_data = pdf.output(dest='S')  # Get PDF as string
    pdf_output.write(pdf_data.encode('latin-1'))
    pdf_output.seek(0)

    response = StreamingResponse(
        io.BytesIO(pdf_output.getvalue()),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=inventory_report.pdf"}
    )
    return response