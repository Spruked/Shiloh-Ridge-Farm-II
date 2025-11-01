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

router = APIRouter(prefix="/accounting", tags=["accounting"])

# Database connection (will be injected)
db = None

def set_accounting_db(database):
    global db
    db = database

class ExpenseCategory(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str  # recurring, one-time
    frequency: Optional[str] = None  # monthly, quarterly, annually (for recurring)

class FarmExpense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # feed_supplements, veterinary_health, equipment_supplies, fuel_maintenance, utilities, labor_services, other
    subcategory: Optional[str] = None  # More specific categorization
    description: str
    amount: float
    date: str
    vendor_supplier: Optional[str] = None
    payment_method: str = "cash"  # cash, check, credit_card, bank_transfer, other
    payment_status: str = "paid"  # paid, pending, scheduled
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None  # weekly, monthly, quarterly, annually
    next_due_date: Optional[str] = None
    reference_id: Optional[str] = None  # Link to livestock, invoice, etc.
    reference_type: Optional[str] = None  # livestock, sale, general
    tax_deductible: bool = False
    notes: Optional[str] = None
    receipts: List[str] = []  # File paths to receipt images
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FarmExpenseCreate(BaseModel):
    category: str
    subcategory: Optional[str] = None
    description: str
    amount: float
    date: str
    vendor_supplier: Optional[str] = None
    payment_method: str = "cash"
    payment_status: str = "paid"
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None
    next_due_date: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    tax_deductible: bool = False
    notes: Optional[str] = None
    receipts: List[str] = []

class RevenueRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # livestock_sales, wool_fiber, milk_products, breeding_fees, grants, other
    description: str
    amount: float
    date: str
    source: Optional[str] = None  # Customer name, auction house, etc.
    payment_method: str = "cash"
    payment_status: str = "received"  # received, pending, overdue
    reference_id: Optional[str] = None  # Link to sale record, etc.
    reference_type: Optional[str] = None
    tax_category: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RevenueRecordCreate(BaseModel):
    type: str
    description: str
    amount: float
    date: str
    source: Optional[str] = None
    payment_method: str = "cash"
    payment_status: str = "received"
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    tax_category: Optional[str] = None
    notes: Optional[str] = None

# Predefined expense categories
EXPENSE_CATEGORIES = [
    {"id": "feed_supplements", "name": "Feed & Supplements", "description": "Animal feed, hay, grain, mineral supplements"},
    {"id": "veterinary_health", "name": "Veterinary & Health", "description": "Vet visits, medications, vaccinations"},
    {"id": "equipment_supplies", "name": "Equipment & Supplies", "description": "Fencing, tools, farm supplies"},
    {"id": "fuel_maintenance", "name": "Fuel & Maintenance", "description": "Vehicle fuel, equipment maintenance"},
    {"id": "utilities", "name": "Utilities", "description": "Electricity, water, internet, phone"},
    {"id": "labor_services", "name": "Labor & Services", "description": "Hired help, professional services"},
    {"id": "facilities_housing", "name": "Facilities & Housing", "description": "Barn repairs, housing improvements"},
    {"id": "marketing_advertising", "name": "Marketing & Advertising", "description": "Website, advertising, show fees"},
    {"id": "insurance_taxes", "name": "Insurance & Taxes", "description": "Property insurance, business taxes"},
    {"id": "other", "name": "Other Expenses", "description": "Miscellaneous farm expenses"}
]

REVENUE_CATEGORIES = [
    {"id": "livestock_sales", "name": "Livestock Sales", "description": "Sale of animals"},
    {"id": "wool_fiber", "name": "Wool & Fiber", "description": "Wool, mohair, fiber sales"},
    {"id": "milk_products", "name": "Milk Products", "description": "Milk, cheese, dairy products"},
    {"id": "breeding_fees", "name": "Breeding Fees", "description": "Breeding service fees"},
    {"id": "grants_subsidies", "name": "Grants & Subsidies", "description": "Government payments, grants"},
    {"id": "other_revenue", "name": "Other Revenue", "description": "Miscellaneous income"}
]

@router.get("/categories/expenses")
async def get_expense_categories():
    return {"categories": EXPENSE_CATEGORIES}

@router.get("/categories/revenue")
async def get_revenue_categories():
    return {"categories": REVENUE_CATEGORIES}

@router.post("/expenses", response_model=FarmExpense)
async def create_expense(expense: FarmExpenseCreate, username: str = Depends(verify_token)):
    expense_obj = FarmExpense(**expense.model_dump())
    doc = expense_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()

    await db.farm_expenses.insert_one(doc)
    return expense_obj

@router.get("/expenses", response_model=List[FarmExpense])
async def get_expenses(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    payment_status: Optional[str] = None,
    username: str = Depends(verify_token)
):
    query = {}

    if category:
        query["category"] = category
    if payment_status:
        query["payment_status"] = payment_status
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["date"] = date_query

    expenses = await db.farm_expenses.find(query, {"_id": 0}).sort("date", -1).to_list(1000)

    for expense in expenses:
        if isinstance(expense.get('created_at'), str):
            expense['created_at'] = datetime.fromisoformat(expense['created_at'])
        if isinstance(expense.get('updated_at'), str):
            expense['updated_at'] = datetime.fromisoformat(expense['updated_at'])

    return expenses

@router.get("/expenses/{expense_id}", response_model=FarmExpense)
async def get_expense(expense_id: str, username: str = Depends(verify_token)):
    expense = await db.farm_expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if isinstance(expense.get('created_at'), str):
        expense['created_at'] = datetime.fromisoformat(expense['created_at'])
    if isinstance(expense.get('updated_at'), str):
        expense['updated_at'] = datetime.fromisoformat(expense['updated_at'])

    return expense

@router.put("/expenses/{expense_id}", response_model=FarmExpense)
async def update_expense(expense_id: str, expense: FarmExpenseCreate, username: str = Depends(verify_token)):
    existing = await db.farm_expenses.find_one({"id": expense_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = expense.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()

    await db.farm_expenses.update_one({"id": expense_id}, {"$set": update_data})

    updated = await db.farm_expenses.find_one({"id": expense_id}, {"_id": 0})
    if updated:
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        return updated
    else:
        raise HTTPException(status_code=404, detail="Expense not found after update")

@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, username: str = Depends(verify_token)):
    result = await db.farm_expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

@router.post("/revenue", response_model=RevenueRecord)
async def create_revenue(revenue: RevenueRecordCreate, username: str = Depends(verify_token)):
    revenue_obj = RevenueRecord(**revenue.model_dump())
    doc = revenue_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()

    await db.farm_revenue.insert_one(doc)
    return revenue_obj

@router.get("/revenue", response_model=List[RevenueRecord])
async def get_revenue(
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    payment_status: Optional[str] = None,
    username: str = Depends(verify_token)
):
    query = {}

    if type:
        query["type"] = type
    if payment_status:
        query["payment_status"] = payment_status
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["date"] = date_query

    revenue = await db.farm_revenue.find(query, {"_id": 0}).sort("date", -1).to_list(1000)

    for record in revenue:
        if isinstance(record.get('created_at'), str):
            record['created_at'] = datetime.fromisoformat(record['created_at'])
        if isinstance(record.get('updated_at'), str):
            record['updated_at'] = datetime.fromisoformat(record['updated_at'])

    return revenue

@router.get("/financial-summary")
async def get_financial_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    username: str = Depends(verify_token)
):
    # Build date filter
    date_filter = {}
    if start_date or end_date:
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date

    # Get expense summary
    expense_pipeline = [
        {"$match": {"date": date_filter} if date_filter else {"$match": {}}},
        {
            "$group": {
                "_id": "$category",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }
        }
    ]

    # Get revenue summary
    revenue_pipeline = [
        {"$match": {"date": date_filter} if date_filter else {"$match": {}}},
        {
            "$group": {
                "_id": "$type",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }
        }
    ]

    expenses_summary = await db.farm_expenses.aggregate(expense_pipeline).to_list(100)
    revenue_summary = await db.farm_revenue.aggregate(revenue_pipeline).to_list(100)

    # Calculate totals
    total_expenses = sum(expense["total"] for expense in expenses_summary)
    total_revenue = sum(rev["total"] for rev in revenue_summary)
    net_profit = total_revenue - total_expenses

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "expenses": {
            "total": total_expenses,
            "by_category": expenses_summary
        },
        "revenue": {
            "total": total_revenue,
            "by_type": revenue_summary
        },
        "profit": {
            "net": net_profit,
            "margin": (net_profit / total_revenue * 100) if total_revenue > 0 else 0
        }
    }

@router.get("/monthly-report/{year}")
async def get_monthly_report(year: int, username: str = Depends(verify_token)):
    """Get monthly financial report for a specific year"""
    pipeline = [
        {
            "$match": {
                "date": {
                    "$gte": f"{year}-01-01",
                    "$lte": f"{year}-12-31"
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "month": {"$substr": ["$date", 5, 2]},
                    "type": {"$literal": "expense"}
                },
                "amount": {"$sum": "$amount"}
            }
        }
    ]

    expense_monthly = await db.farm_expenses.aggregate(pipeline).to_list(12)

    revenue_pipeline = [
        {
            "$match": {
                "date": {
                    "$gte": f"{year}-01-01",
                    "$lte": f"{year}-12-31"
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "month": {"$substr": ["$date", 5, 2]},
                    "type": {"$literal": "revenue"}
                },
                "amount": {"$sum": "$amount"}
            }
        }
    ]

    revenue_monthly = await db.farm_revenue.aggregate(revenue_pipeline).to_list(12)

    # Combine and format results
    monthly_data = {}
    for i in range(1, 13):
        month_str = f"{i:02d}"
        monthly_data[month_str] = {
            "month": month_str,
            "expenses": 0,
            "revenue": 0,
            "profit": 0
        }

    for exp in expense_monthly:
        month = exp["_id"]["month"]
        monthly_data[month]["expenses"] = exp["amount"]

    for rev in revenue_monthly:
        month = rev["_id"]["month"]
        monthly_data[month]["revenue"] = rev["amount"]

    # Calculate profit
    for month_data in monthly_data.values():
        month_data["profit"] = month_data["revenue"] - month_data["expenses"]

    return {"year": year, "monthly": list(monthly_data.values())}

@router.post("/recurring-expenses/generate")
async def generate_recurring_expenses(username: str = Depends(verify_token)):
    """Generate pending recurring expenses for the current period"""
    # This would check recurring expenses and create new entries
    # For now, return a placeholder
    return {"message": "Recurring expense generation to be implemented", "status": "pending"}

@router.get("/export/csv")
async def export_accounting_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type_filter: Optional[str] = None,  # "expenses", "revenue", or None for both
    username: str = Depends(verify_token)
):
    """Export accounting data as CSV"""
    query = {}
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date

    # Export both expenses and revenue
    expenses = []
    revenue = []

    if not type_filter or type_filter == "expenses":
        expenses = await db.farm_expenses.find(query, {"_id": 0}).sort("date", -1).to_list(10000)

    if not type_filter or type_filter == "revenue":
        revenue = await db.farm_revenue.find(query, {"_id": 0}).sort("date", -1).to_list(10000)

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Type", "Category", "Description", "Amount", "Date", "Vendor/Supplier",
        "Payment Method", "Payment Status", "Tax Deductible", "Notes", "Created At"
    ])

    # Write expenses
    for expense in expenses:
        writer.writerow([
            "Expense",
            expense.get("category", ""),
            expense.get("description", ""),
            expense.get("amount", 0),
            expense.get("date", ""),
            expense.get("vendor_supplier", ""),
            expense.get("payment_method", ""),
            expense.get("payment_status", ""),
            "Yes" if expense.get("tax_deductible") else "No",
            expense.get("notes", ""),
            expense.get("created_at", "").split("T")[0] if expense.get("created_at") else ""
        ])

    # Write revenue
    for rev in revenue:
        writer.writerow([
            "Revenue",
            rev.get("type", ""),
            rev.get("description", ""),
            rev.get("amount", 0),
            rev.get("date", ""),
            rev.get("source", ""),
            rev.get("payment_method", ""),
            rev.get("payment_status", ""),
            "",
            rev.get("notes", ""),
            rev.get("created_at", "").split("T")[0] if rev.get("created_at") else ""
        ])

    output.seek(0)
    response = StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=accounting_export.csv"}
    )
    return response

@router.get("/export/pdf")
async def export_accounting_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type_filter: Optional[str] = None,  # "expenses", "revenue", or None for both
    username: str = Depends(verify_token)
):
    """Export accounting data as PDF report"""
    query = {}
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date

    # Get both expenses and revenue
    expenses = []
    revenue = []

    if not type_filter or type_filter == "expenses":
        expenses = await db.farm_expenses.find(query, {"_id": 0}).sort("date", -1).to_list(10000)

    if not type_filter or type_filter == "revenue":
        revenue = await db.farm_revenue.find(query, {"_id": 0}).sort("date", -1).to_list(10000)

    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "Shiloh Ridge Farm - Accounting Report", 0, 1, "C")
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
    total_expenses = sum(exp.get("amount", 0) for exp in expenses)
    total_revenue = sum(rev.get("amount", 0) for rev in revenue)
    net_profit = total_revenue - total_expenses

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, f"Total Expenses: ${total_expenses:,.2f}", 0, 1)
    pdf.cell(0, 10, f"Total Revenue: ${total_revenue:,.2f}", 0, 1)
    pdf.cell(0, 10, f"Net Profit: ${net_profit:,.2f}", 0, 1)
    pdf.ln(10)

    # Expenses section
    if expenses:
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, "Expenses", 0, 1)
        pdf.ln(5)

        pdf.set_font("Arial", "B", 8)
        pdf.cell(25, 8, "Date", 1)
        pdf.cell(35, 8, "Category", 1)
        pdf.cell(50, 8, "Description", 1)
        pdf.cell(25, 8, "Amount", 1)
        pdf.cell(25, 8, "Vendor", 1)
        pdf.cell(0, 8, "Status", 1, 1)

        pdf.set_font("Arial", "", 8)
        for expense in expenses[:30]:  # Limit for readability
            pdf.cell(25, 6, str(expense.get("date", ""))[:24], 1)
            pdf.cell(35, 6, str(expense.get("category", ""))[:34], 1)
            pdf.cell(50, 6, str(expense.get("description", ""))[:49], 1)
            amount = expense.get("amount", 0)
            pdf.cell(25, 6, f"${amount:,.0f}", 1)
            pdf.cell(25, 6, str(expense.get("vendor_supplier", ""))[:24], 1)
            pdf.cell(0, 6, str(expense.get("payment_status", ""))[:15], 1, 1)

        if len(expenses) > 30:
            pdf.set_font("Arial", "I", 8)
            pdf.cell(0, 6, f"... and {len(expenses) - 30} more expenses", 0, 1)

        pdf.ln(10)

    # Revenue section
    if revenue:
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, "Revenue", 0, 1)
        pdf.ln(5)

        pdf.set_font("Arial", "B", 8)
        pdf.cell(25, 8, "Date", 1)
        pdf.cell(35, 8, "Type", 1)
        pdf.cell(50, 8, "Description", 1)
        pdf.cell(25, 8, "Amount", 1)
        pdf.cell(25, 8, "Source", 1)
        pdf.cell(0, 8, "Status", 1, 1)

        pdf.set_font("Arial", "", 8)
        for rev in revenue[:30]:  # Limit for readability
            pdf.cell(25, 6, str(rev.get("date", ""))[:24], 1)
            pdf.cell(35, 6, str(rev.get("type", ""))[:34], 1)
            pdf.cell(50, 6, str(rev.get("description", ""))[:49], 1)
            amount = rev.get("amount", 0)
            pdf.cell(25, 6, f"${amount:,.0f}", 1)
            pdf.cell(25, 6, str(rev.get("source", ""))[:24], 1)
            pdf.cell(0, 6, str(rev.get("payment_status", ""))[:15], 1, 1)

        if len(revenue) > 30:
            pdf.set_font("Arial", "I", 8)
            pdf.cell(0, 6, f"... and {len(revenue) - 30} more revenue entries", 0, 1)

    # Create response
    pdf_output = io.BytesIO()
    pdf_data = pdf.output(dest='S')  # Get PDF as string
    pdf_output.write(pdf_data.encode('latin-1'))
    pdf_output.seek(0)

    response = StreamingResponse(
        io.BytesIO(pdf_output.getvalue()),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=accounting_report.pdf"}
    )
    return response