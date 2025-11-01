from fastapi import APIRouter, HTTPException, Depends, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from auth import verify_token
from fpdf import FPDF
import os
from pathlib import Path
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/sales", tags=["sales"])

# Database connection (will be injected)
db = None

def set_sales_db(database):
    global db
    db = database

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    customer_type: str = "individual"  # individual, business, breeder
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    address: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    customer_type: str = "individual"
    notes: Optional[str] = None

class SaleItem(BaseModel):
    inventory_id: str
    animal_id: str
    animal_type: str
    quantity: int = 1
    unit_price: float
    weight: Optional[float] = None
    weight_unit: str = "lbs"
    description: str

class SalesRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str  # Auto-generated unique invoice number
    sale_date: str
    customer_id: str
    customer_info: Dict[str, Any]  # Embedded customer data at time of sale
    items: List[SaleItem]
    sale_type: str = "market"  # breeding_stock, meat, show, custom_order, market
    subtotal: float
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    total_amount: float
    payment_method: str = "cash"  # cash, check, online, crypto, nft
    payment_status: str = "pending"  # pending, paid, overdue, cancelled
    due_date: Optional[str] = None
    notes: Optional[str] = None
    delivery_status: str = "pending"  # pending, shipped, delivered, pickup
    delivery_date: Optional[str] = None
    invoice_pdf_path: Optional[str] = None
    receipt_pdf_path: Optional[str] = None
    blockchain_tx_id: Optional[str] = None  # For NFT receipts
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SalesRecordCreate(BaseModel):
    customer_id: str
    items: List[SaleItem]
    sale_type: str = "market"
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    payment_method: str = "cash"
    payment_status: str = "pending"
    due_date: Optional[str] = None
    notes: Optional[str] = None
    delivery_status: str = "pending"

def generate_invoice_id():
    """Generate a unique invoice ID"""
    timestamp = datetime.now().strftime("%Y%m%d")
    unique_id = str(uuid.uuid4())[:8].upper()
    return f"INV-{timestamp}-{unique_id}"

def calculate_totals(items: List[SaleItem], tax_amount: float = 0.0, discount_amount: float = 0.0):
    """Calculate subtotal and total from items"""
    subtotal = sum(item.unit_price * item.quantity for item in items)
    total = subtotal + tax_amount - discount_amount
    return subtotal, total

@router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, username: str = Depends(verify_token)):
    customer_obj = Customer(**customer.model_dump())
    doc = customer_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()

    await db.customers.insert_one(doc)
    return customer_obj

@router.get("/customers", response_model=List[Customer])
async def get_customers(username: str = Depends(verify_token)):
    customers = await db.customers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

    for customer in customers:
        if isinstance(customer.get('created_at'), str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
        if isinstance(customer.get('updated_at'), str):
            customer['updated_at'] = datetime.fromisoformat(customer['updated_at'])

    return customers

@router.post("/", response_model=SalesRecord)
async def create_sale(sale: SalesRecordCreate, username: str = Depends(verify_token)):
    # Get customer info
    customer = await db.customers.find_one({"id": sale.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Validate inventory items exist and are available
    for item in sale.items:
        inventory_item = await db.livestock_inventory.find_one({"id": item.inventory_id})
        if not inventory_item:
            raise HTTPException(status_code=404, detail=f"Inventory item {item.inventory_id} not found")
        if inventory_item.get('status') == 'sold':
            raise HTTPException(status_code=400, detail=f"Item {item.animal_id} is already sold")

    # Calculate totals
    subtotal, total_amount = calculate_totals(sale.items, sale.tax_amount, sale.discount_amount)

    # Create sale record
    sale_obj = SalesRecord(
        invoice_id=generate_invoice_id(),
        sale_date=datetime.now().strftime("%Y-%m-%d"),
        customer_id=sale.customer_id,
        customer_info={
            "name": customer.get("name"),
            "address": customer.get("address"),
            "email": customer.get("email"),
            "phone": customer.get("phone")
        },
        items=sale.items,
        sale_type=sale.sale_type,
        subtotal=subtotal,
        tax_amount=sale.tax_amount,
        discount_amount=sale.discount_amount,
        total_amount=total_amount,
        payment_method=sale.payment_method,
        payment_status=sale.payment_status,
        due_date=sale.due_date,
        notes=sale.notes,
        delivery_status=sale.delivery_status
    )

    doc = sale_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()

    await db.sales_records.insert_one(doc)

    # Update inventory status to sold
    for item in sale.items:
        await db.livestock_inventory.update_one(
            {"id": item.inventory_id},
            {
                "$set": {
                    "status": "sold",
                    "sale_price": item.unit_price,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

    return sale_obj

@router.get("/", response_model=List[SalesRecord])
async def get_sales(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    username: str = Depends(verify_token)
):
    query = {}

    if status:
        query["payment_status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["sale_date"] = date_query

    sales = await db.sales_records.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    for sale in sales:
        if isinstance(sale.get('created_at'), str):
            sale['created_at'] = datetime.fromisoformat(sale['created_at'])
        if isinstance(sale.get('updated_at'), str):
            sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])

    return sales

@router.get("/{sale_id}", response_model=SalesRecord)
async def get_sale(sale_id: str, username: str = Depends(verify_token)):
    sale = await db.sales_records.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale record not found")

    if isinstance(sale.get('created_at'), str):
        sale['created_at'] = datetime.fromisoformat(sale['created_at'])
    if isinstance(sale.get('updated_at'), str):
        sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])

    return sale

@router.put("/{sale_id}/payment-status")
async def update_payment_status(sale_id: str, status: str, username: str = Depends(verify_token)):
    existing = await db.sales_records.find_one({"id": sale_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Sale record not found")

    valid_statuses = ["pending", "paid", "overdue", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    await db.sales_records.update_one(
        {"id": sale_id},
        {"$set": {"payment_status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": f"Payment status updated to {status}"}

@router.put("/{sale_id}/delivery-status")
async def update_delivery_status(sale_id: str, status: str, delivery_date: Optional[str] = None, username: str = Depends(verify_token)):
    existing = await db.sales_records.find_one({"id": sale_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Sale record not found")

    valid_statuses = ["pending", "shipped", "delivered", "pickup"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    update_data = {"delivery_status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if delivery_date:
        update_data["delivery_date"] = delivery_date

    await db.sales_records.update_one({"id": sale_id}, {"$set": update_data})

    return {"message": f"Delivery status updated to {status}"}

@router.get("/stats/summary")
async def get_sales_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    username: str = Depends(verify_token)
):
    match_stage = {}
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        match_stage["sale_date"] = date_query

    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {
            "$group": {
                "_id": {
                    "payment_status": "$payment_status",
                    "sale_type": "$sale_type"
                },
                "count": {"$sum": 1},
                "total_amount": {"$sum": "$total_amount"},
                "total_tax": {"$sum": "$tax_amount"}
            }
        },
        {
            "$group": {
                "_id": "$_id.payment_status",
                "types": {
                    "$push": {
                        "type": "$_id.sale_type",
                        "count": "$count",
                        "total_amount": "$total_amount",
                        "total_tax": "$total_tax"
                    }
                },
                "total_count": {"$sum": "$count"},
                "total_amount": {"$sum": "$total_amount"},
                "total_tax": {"$sum": "$total_tax"}
            }
        }
    ]

    summary = await db.sales_records.aggregate(pipeline).to_list(100)
    return {"summary": summary}

@router.get("/export/csv")
async def export_sales_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    username: str = Depends(verify_token)
):
    """Export sales data as CSV"""
    query = {}
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date

    sales = await db.sales_records.find(query, {"_id": 0}).sort("date", -1).to_list(10000)

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Invoice ID", "Date", "Customer Name", "Customer Email", "Items Count",
        "Subtotal", "Tax Amount", "Total Amount", "Payment Method", "Payment Status",
        "Notes", "Created At"
    ])

    # Write data
    for sale in sales:
        customer_name = ""
        customer_email = ""

        # Get customer info if customer_id exists
        if sale.get("customer_id"):
            customer = await db.customers.find_one({"id": sale["customer_id"]}, {"_id": 0})
            if customer:
                customer_name = customer.get("name", "")
                customer_email = customer.get("email", "")

        writer.writerow([
            sale.get("invoice_id", ""),
            sale.get("date", ""),
            customer_name,
            customer_email,
            len(sale.get("items", [])),
            sale.get("subtotal", 0),
            sale.get("tax_amount", 0),
            sale.get("total_amount", 0),
            sale.get("payment_method", ""),
            sale.get("payment_status", ""),
            sale.get("notes", ""),
            sale.get("created_at", "").split("T")[0] if sale.get("created_at") else ""
        ])

    output.seek(0)
    response = StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_export.csv"}
    )
    return response

@router.get("/export/pdf")
async def export_sales_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    username: str = Depends(verify_token)
):
    """Export sales data as PDF report"""
    query = {}
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date

    sales = await db.sales_records.find(query, {"_id": 0}).sort("date", -1).to_list(10000)

    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Shiloh Ridge Farm - Sales Report", 0, 1, "C")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1, "C")

    if start_date or end_date:
        date_range = ""
        if start_date and end_date:
            date_range = f"Period: {start_date} to {end_date}"
        elif start_date:
            date_range = f"From: {start_date}"
        elif end_date:
            date_range = f"To: {end_date}"
        pdf.cell(0, 10, date_range, 0, 1, "C")

    pdf.ln(10)

    # Summary stats
    total_sales = len(sales)
    total_revenue = sum(sale.get("total_amount", 0) for sale in sales)
    paid_sales = len([s for s in sales if s.get("payment_status") == "paid"])
    pending_sales = len([s for s in sales if s.get("payment_status") == "pending"])

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, f"Total Sales: {total_sales}", 0, 1)
    pdf.cell(0, 10, f"Total Revenue: ${total_revenue:,.2f}", 0, 1)
    pdf.cell(0, 10, f"Paid Sales: {paid_sales}", 0, 1)
    pdf.cell(0, 10, f"Pending Sales: {pending_sales}", 0, 1)
    pdf.ln(10)

    # Detailed table
    pdf.set_font("Arial", "B", 8)
    pdf.cell(25, 8, "Invoice ID", 1)
    pdf.cell(20, 8, "Date", 1)
    pdf.cell(40, 8, "Customer", 1)
    pdf.cell(25, 8, "Amount", 1)
    pdf.cell(20, 8, "Payment", 1)
    pdf.cell(0, 8, "Status", 1, 1)

    pdf.set_font("Arial", "", 8)
    for sale in sales[:50]:  # Limit to first 50 for PDF readability
        customer_name = "Walk-in"
        if sale.get("customer_id"):
            customer = await db.customers.find_one({"id": sale["customer_id"]}, {"_id": 0})
            if customer:
                customer_name = customer.get("name", "Unknown")[:18]

        pdf.cell(25, 6, str(sale.get("invoice_id", ""))[:24], 1)
        pdf.cell(20, 6, str(sale.get("date", ""))[:19], 1)
        pdf.cell(40, 6, customer_name, 1)
        amount = sale.get("total_amount", 0)
        pdf.cell(25, 6, f"${amount:,.0f}", 1)
        pdf.cell(20, 6, str(sale.get("payment_method", ""))[:19], 1)
        pdf.cell(0, 6, str(sale.get("payment_status", ""))[:15], 1, 1)

    if len(sales) > 50:
        pdf.set_font("Arial", "I", 8)
        pdf.cell(0, 6, f"... and {len(sales) - 50} more sales", 0, 1)

    # Create response
    pdf_output = io.BytesIO()
    pdf_data = pdf.output(dest='S')  # Get PDF as string
    pdf_output.write(pdf_data.encode('latin-1'))
    pdf_output.seek(0)

    response = StreamingResponse(
        io.BytesIO(pdf_output.getvalue()),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=sales_report.pdf"}
    )
    return response