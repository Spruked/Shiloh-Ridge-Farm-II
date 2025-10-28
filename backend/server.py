from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
from fastapi.responses import FileResponse
import tempfile
from fpdf import FPDF

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET', 'shiloh-ridge-farm-secret-key-2025')
ALGORITHM = "HS256"

# Models
class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class Livestock(BaseModel):
    def registry_compliance(self):
        compliance = {
            "parents_registered": bool(getattr(self, "sire_tag", None) and getattr(self, "dam_tag", None) and getattr(self, "sire_name", None) and getattr(self, "dam_name", None) and getattr(self, "sire_tag", "") != "" and getattr(self, "dam_tag", "") != "" and getattr(self, "sire_tag", "") != "N/A" and getattr(self, "dam_tag", "") != "N/A"),
            "coat_type_ok": getattr(self, "coat_type", None) in ["A", "B"] if getattr(self, "animal_type") == "sheep" else True,
            "blood_percentage_ok": getattr(self, "blood_percentage", None) is not None and getattr(self, "blood_percentage", 0) >= 87.5 if getattr(self, "animal_type") in ["sheep", "hog", "cattle"] else True,
            "permanent_id": bool(getattr(self, "tag_number", None)),
            "inspected": bool(getattr(self, "inspected", None)),
            "eligible_for_registration": False,
            "eligible_for_recording": getattr(self, "blood_percentage", None) is not None and getattr(self, "blood_percentage", 0) >= 50.0 if getattr(self, "animal_type") in ["sheep", "hog", "cattle"] else True,
        }
        compliance["eligible_for_registration"] = (
            compliance["parents_registered"] and compliance["coat_type_ok"] and compliance["blood_percentage_ok"] and compliance["permanent_id"] and compliance["inspected"]
        )
        return compliance
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    animal_type: str  # sheep, hog, cattle, chicken, dog
    tag_number: str
    birth_type: Optional[str] = None  # Sg, Tw, Tr, Nat
    breeding_type: Optional[str] = None  # Nat, AI, ET
    genotype: Optional[str] = None  # RR, QR, QQ, N/A
    date_of_birth: Optional[str] = None
    sex: Optional[str] = None  # R, E, M, F
    sire_name: Optional[str] = None
    sire_tag: Optional[str] = None
    dam_name: Optional[str] = None
    dam_tag: Optional[str] = None
    registration_number: Optional[str] = None
    flock_id: Optional[str] = None
    coat_type: Optional[str] = None  # A, B, C, N/A
    blood_percentage: Optional[float] = None
    inspected: Optional[bool] = None
    transfer_info: Optional[Dict[str, Any]] = None  # {name, address}
    weight: Optional[float] = None
    color: Optional[str] = None
    bloodline: Optional[str] = None
    price: Optional[float] = None
    status: str = "available"  # available, sold, breeding_stock, not_for_sale
    photos: List[str] = []
    description: Optional[str] = None
    health_records: Optional[str] = None
    nft_minted: bool = False
    nft_token_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LivestockCreate(BaseModel):
    animal_type: str  # sheep, hog, cattle, chicken, dog
    tag_number: str
    birth_type: Optional[str] = None  # Sg, Tw, Tr, Nat
    breeding_type: Optional[str] = None  # Nat, AI, ET
    genotype: Optional[str] = None  # RR, QR, QQ, N/A
    date_of_birth: Optional[str] = None
    sex: Optional[str] = None  # R, E, M, F
    sire_name: Optional[str] = None
    sire_tag: Optional[str] = None
    dam_name: Optional[str] = None
    dam_tag: Optional[str] = None
    registration_number: Optional[str] = None
    flock_id: Optional[str] = None
    coat_type: Optional[str] = None  # A, B, C, N/A
    blood_percentage: Optional[float] = None
    inspected: Optional[bool] = None
    transfer_info: Optional[Dict[str, Any]] = None  # {name, address}
    weight: Optional[float] = None
    color: Optional[str] = None
    bloodline: Optional[str] = None
    price: Optional[float] = None
    status: str = "available"
    photos: List[str] = []
    description: Optional[str] = None
    health_records: Optional[str] = None

class ContactForm(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default=str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    inquiry_type: str = "general"  # general, offer, animal_inquiry
    animal_id: Optional[str] = None
    offer_amount: Optional[float] = None
    status: str = "new"  # new, read, responded
    created_at: datetime = Field(default=datetime.now(timezone.utc))

class ContactFormCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    inquiry_type: str = "general"  # general, offer, animal_inquiry
    animal_id: Optional[str] = None
    offer_amount: Optional[float] = None

class TransferContactForm(BaseModel):
    animal_id: str
    buyer_name: str
    buyer_address: str
    message: Optional[str] = None

class AboutContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "about_page"
    title: str = "About Shiloh Ridge Farm"
    content: str
    mission: Optional[str] = None
    history: Optional[str] = None
    updated_at: datetime = Field(default=datetime.now(timezone.utc))

class AboutContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    mission: Optional[str] = None
    history: Optional[str] = None

class BlogContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "blog_page"
    title: str = "Farm Blog"
    posts: List[Dict[str, Any]] = Field(default_factory=list)
    updated_at: datetime = Field(default=datetime.now(timezone.utc))

class BlogContentUpdate(BaseModel):
    title: Optional[str] = None
    posts: Optional[List[Dict[str, Any]]] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site_settings"
    usda_api_key: Optional[str] = None
    email_api_key: Optional[str] = None
    ticker_api_key: Optional[str] = None
    livestock_api_key: Optional[str] = None
    polygon_wallet_address: Optional[str] = None
    polygon_api_key: Optional[str] = None
    updated_at: datetime = Field(default=datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    usda_api_key: Optional[str] = None
    email_api_key: Optional[str] = None
    ticker_api_key: Optional[str] = None
    livestock_api_key: Optional[str] = None
    polygon_wallet_address: Optional[str] = None
    polygon_api_key: Optional[str] = None

class NFTRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default=str(uuid.uuid4()))
    livestock_id: str
    token_id: Optional[str] = None
    contract_address: Optional[str] = None
    transaction_hash: Optional[str] = None
    metadata_uri: Optional[str] = None
    status: str = "pending"  # pending, minting, minted, failed
    created_at: datetime = Field(default=datetime.now(timezone.utc))
    updated_at: datetime = Field(default=datetime.now(timezone.utc))

class NFTMintRequest(BaseModel):
    livestock_id: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # "Eggs", "Half Hog", "Whole Hog", "Sheep Meat", "Lamb Meat"
    category: str  # "eggs", "hog", "sheep"
    type: str  # "half_hog", "whole_hog", "eggs", "sheep_meat", "lamb_meat"
    description: str
    # price_per_unit/unit are used for simple products. For cut-based products use `cuts`.
    price_per_unit: Optional[float] = None
    unit: Optional[str] = None  # "dozen", "pound", "each"
    # Optional per-cut pricing structure. Example:
    # {"loin": {"normalized": 3.5, "premium": 4.5}, "belly": {"normalized": 2.75, "premium": 3.75}}
    cuts: Optional[Dict[str, Dict[str, float]]] = Field(default_factory=dict)
    min_order_quantity: int = 1
    max_order_quantity: Optional[int] = None
    available_quantity: Optional[int] = None  # None means unlimited/pre-order
    is_available: bool = True
    estimated_lead_time: str  # "2-4 weeks", "4-8 weeks", etc.
    photos: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    category: str
    type: str
    description: str
    price_per_unit: Optional[float] = None
    unit: Optional[str] = None
    cuts: Optional[Dict[str, Dict[str, float]]] = {}
    min_order_quantity: int = 1
    max_order_quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    is_available: bool = True
    estimated_lead_time: str
    photos: List[str] = []

class OrderItem(BaseModel):
    product_id: str
    quantity: int
    cut: Optional[str] = None
    pricing_tier: str = "normalized"  # "normalized" or "premium"
    price_per_unit: Optional[float] = None


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    customer_address: str
    order_items: List[Dict[str, Any]]  # stored as dicts with selected cut/pricing
    total_amount: float
    status: str = "pending"  # pending, confirmed, processing, ready, completed, cancelled
    notes: Optional[str] = None
    delivery_method: Optional[str] = None
    preferred_pickup_date: Optional[str] = None
    estimated_delivery: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    customer_address: str
    order_items: List[OrderItem]
    notes: Optional[str] = None
    delivery_method: Optional[str] = None
    preferred_pickup_date: Optional[str] = None

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    filename: str
    description: Optional[str] = None
    category: str  # "certificates", "reports", "applications", "other"
    file_path: str  # relative path from static files directory
    file_size: int
    mime_type: str
    is_public: bool = True  # whether visitors can download it
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    is_public: bool = True

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Certificate and transfer paperwork endpoints
@api_router.get("/livestock/{livestock_id}/certificate")
async def get_livestock_certificate(livestock_id: str, username: str = Depends(verify_token)):
    livestock = await db.livestock.find_one({"id": livestock_id}, {"_id": 0})
    if not livestock:
        raise HTTPException(status_code=404, detail="Livestock not found")
    # Ensure livestock is a dict before iterating
    if not isinstance(livestock, dict):
        raise HTTPException(status_code=500, detail="Livestock data is invalid")
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, "KHSI Registration Certificate", ln=True, align="C")
    for key, value in livestock.items():
        pdf.cell(200, 10, f"{key}: {value}", ln=True)
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    pdf.output(temp.name)
    return FileResponse(temp.name, media_type="application/pdf", filename=f"certificate_{livestock_id}.pdf")

@api_router.get("/livestock/{livestock_id}/transfer-paperwork")
async def get_transfer_paperwork(livestock_id: str, username: str = Depends(verify_token)):
    livestock = await db.livestock.find_one({"id": livestock_id}, {"_id": 0})
    if not livestock:
        raise HTTPException(status_code=404, detail="Livestock not found")
    transfer_info = livestock.get("transfer_info", {})
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, "KHSI Transfer Paperwork", ln=True, align="C")
    pdf.cell(200, 10, f"Animal ID: {livestock_id}", ln=True)
    pdf.cell(200, 10, f"Buyer Name: {transfer_info.get('name', '')}", ln=True)
    pdf.cell(200, 10, f"Buyer Address: {transfer_info.get('address', '')}", ln=True)
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    pdf.output(temp.name)
    return FileResponse(temp.name, media_type="application/pdf", filename=f"transfer_{livestock_id}.pdf")

# Registry compliance check endpoint
@api_router.get("/livestock/{livestock_id}/compliance")
async def get_registry_compliance(livestock_id: str, username: str = Depends(verify_token)):
    livestock = await db.livestock.find_one({"id": livestock_id}, {"_id": 0})
    if not livestock:
        raise HTTPException(status_code=404, detail="Livestock not found")
    livestock_obj = Livestock(**livestock)
    return livestock_obj.registry_compliance()

# Initialize admin user and default data
@app.on_event("startup")
async def startup_event():
    # Create default admin user if not exists
    admin = await db.admin_users.find_one({"username": "admin"})
    if not admin:
        hashed_password = pwd_context.hash("admin123")
        admin_user = AdminUser(
            username="admin",
            password_hash=hashed_password
        )
        doc = admin_user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.admin_users.insert_one(doc)
        logger.info("Default admin user created: admin/admin123")
    
    # Create default about page if not exists
    about = await db.about_content.find_one({"id": "about_page"})
    if not about:
        default_about = AboutContent(
            content="Shiloh Ridge Farm is a family-owned ranch specializing in quality Katahdin sheep, live hogs, and select cattle.",
            mission="To provide high-quality, ethically-raised livestock with complete registration and bloodline documentation.",
            history="Established in 2010, Shiloh Ridge Farm has been committed to integrity and honesty in livestock breeding and sales."
        )
        doc = default_about.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.about_content.insert_one(doc)
    
    # Create default blog page if not exists
    blog = await db.blog_content.find_one({"id": "blog_page"})
    if not blog:
        default_blog = BlogContent(
            title="Farm Blog",
            posts=[
                {
                    "id": "katahdin-love",
                    "title": "Why we love Katahdin sheep at Shiloh Ridge Farm",
                    "content": """At Shiloh Ridge Farm we've been raising sheep, hogs and cattle for a long time—but when we switched attention to the Katahdin sheep hair sheep, things really started to click. Here's why these folks are becoming our favourite kind of sheep—and why you might want to consider them too.

1. Easy care = more time for what matters
Katahdins shed their coats naturally—they don't require the yearly shear, tail-dock or heavy crutching that many wool breeds do. That means fewer headaches, less labour, more time on pasture and enjoying life—which is important to us (and to you if you're doing this not just as a job, but as a way of life).

2. Strong mothering, good reproduction
These sheep excel in fertility, prolificacy (twins, triplets), mothering ability and milk production. At Shiloh Ridge, that means fewer issues lambing out, more lambs weaning, less veterinary stress and a healthier, more resilient flock.

3. Resistant to parasites—especially valuable in our region
In the Midwest (where we are: Iowa/Missouri/Kansas/Nebraska region), internal parasite load is a persistent challenge. Katahdins carry documented resistance to gastrointestinal nematodes and benefit operations where high animal health standards are essential.

4. The community & registry support keeps getting stronger
The breed is managed by KHSI with an online registry, searchable databases and more. If you're doing this seriously (breeding, full-blood lines, or high-quality commercial lambs) that infrastructure matters.

5. Where we at Shiloh Ridge go from here
We're committed to raising Katahdin stock with excellence: registering full-bloods, participating in performance records, aligning with breed associations, and focusing on genetics that will carry us forward. Our vision: build a solid base that allows us to not only produce great lambs, but also pass that heritage to our daughter's future—something stable, dependable, rooted in honest work.

If you've been thinking about raising hair sheep, or want to shift your flock to a lower-input, high-function breed, we'd love to talk with you. Drop us a line at the farm, check out our inventory and let's explore what Katahdins might do for you.""",
                    "author": "Shiloh Ridge Farm",
                    "published_date": "2025-10-27",
                    "tags": ["Katahdin", "sheep", "breeding", "farm life"],
                    "featured": True
                }
            ]
        )
        doc = default_blog.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.blog_content.insert_one(doc)
    
    # Create default settings if not exists
    settings = await db.settings.find_one({"id": "site_settings"})
    if not settings:
        default_settings = Settings(
            usda_api_key="N/KUHW09nFC2hAWvW1Vb1gvVL1k7BqUd",
            polygon_wallet_address="0x22831611004eD557E9ddB43e262Df64909Dd8b6E",
            polygon_api_key="e12adc74792a4c30b4e2965d1ecceac9"
        )
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
    
    # Create default products if not exists
    products_count = await db.products.count_documents({})
    if products_count == 0:
        default_products = [
            Product(
                name="Farm Fresh Eggs",
                category="eggs",
                type="eggs",
                description="Farm fresh eggs from our pasture-raised heritage breed chickens. Available in dozens.",
                price_per_unit=8.00,
                unit="dozen",
                min_order_quantity=1,
                available_quantity=0,
                is_available=True,
                estimated_lead_time="1 week",
                photos=[]
            ),
            Product(
                name="Rhode Island Red Eggs",
                category="eggs",
                type="eggs",
                description="Rich brown eggs from our heritage Rhode Island Red hens. Known for excellent flavor and nutrition.",
                price_per_unit=9.00,
                unit="dozen",
                min_order_quantity=1,
                available_quantity=0,
                is_available=True,
                estimated_lead_time="1 week",
                photos=[]
            ),
            Product(
                name="Ameraucana Blue Eggs",
                category="eggs",
                type="eggs",
                description="Beautiful blue eggs from our Ameraucana hens. Unique color and excellent taste.",
                price_per_unit=10.00,
                unit="dozen",
                min_order_quantity=1,
                available_quantity=0,
                is_available=True,
                estimated_lead_time="1 week",
                photos=[]
            ),
            Product(
                name="Heritage Chickens",
                category="chicken",
                type="chicken",
                description="Pasture-raised heritage breed chickens. Perfect for your homestead flock.",
                price_per_unit=25.00,
                unit="each",
                min_order_quantity=1,
                available_quantity=0,
                is_available=True,
                estimated_lead_time="2 weeks",
                photos=[]
            ),
            Product(
                name="Half Hog - Custom Cuts",
                category="hog",
                type="half_hog",
                description="Half of a pasture-raised hog with your choice of cuts. Approximately 80-100 lbs of meat.",
                cuts={
                    "loin": {"normalized": 3.50, "premium": 4.50},
                    "belly": {"normalized": 2.75, "premium": 3.75},
                    "shoulder": {"normalized": 3.00, "premium": 4.00},
                    "ham": {"normalized": 3.25, "premium": 4.25},
                    "ribs": {"normalized": 4.00, "premium": 5.00},
                    "ground_pork": {"normalized": 2.50, "premium": 3.50}
                },
                min_order_quantity=1,
                available_quantity=0,
                is_available=True,
                estimated_lead_time="2 weeks",
                photos=[]
            ),
            Product(
                name="Whole Hog - Custom Cuts",
                category="hog",
                type="whole_hog",
                description="Whole pasture-raised hog with your choice of cuts. Approximately 160-200 lbs of meat.",
                cuts={
                    "loin": {"normalized": 3.25, "premium": 4.25},
                    "belly": {"normalized": 2.50, "premium": 3.50},
                    "shoulder": {"normalized": 2.75, "premium": 3.75},
                    "ham": {"normalized": 3.00, "premium": 4.00},
                    "ribs": {"normalized": 3.75, "premium": 4.75},
                    "ground_pork": {"normalized": 2.25, "premium": 3.25}
                },
                min_order_quantity=1,
                available_quantity=0,
                is_available=True,
                estimated_lead_time="3 weeks",
                photos=[]
            ),
            Product(
                name="Sheep Meat - Custom Cuts",
                category="sheep",
                type="sheep_meat",
                description="Pasture-raised sheep meat with your choice of cuts. Available by the pound.",
                cuts={
                    "leg": {"normalized": 12.00, "premium": 14.00},
                    "shoulder": {"normalized": 10.00, "premium": 12.00},
                    "loin": {"normalized": 15.00, "premium": 17.00},
                    "rib": {"normalized": 13.00, "premium": 15.00},
                    "ground_lamb": {"normalized": 11.00, "premium": 13.00}
                },
                unit="lb",
                min_order_quantity=10,
                available_quantity=0,
                is_available=True,
                estimated_lead_time="2 weeks",
                photos=[]
            ),
            Product(
                name="Lamb Meat - Custom Cuts",
                category="sheep",
                type="lamb_meat",
                description="Tender pasture-raised lamb meat with your choice of cuts. Available by the pound.",
                cuts={
                    "leg": {"normalized": 15.00, "premium": 17.00},
                    "shoulder": {"normalized": 13.00, "premium": 15.00},
                    "loin": {"normalized": 18.00, "premium": 20.00},
                    "rib": {"normalized": 16.00, "premium": 18.00},
                    "ground_lamb": {"normalized": 14.00, "premium": 16.00}
                },
                unit="lb",
                min_order_quantity=10,
                available_quantity=0,
                is_available=True,
                estimated_lead_time="2 weeks",
                photos=[]
            )
        ]
        
        for product in default_products:
            doc = product.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.products.insert_one(doc)

    # Create default livestock if not exists
    livestock_count = await db.livestock.count_documents({})
    if livestock_count == 0:
        default_livestock = [
            Livestock(
                animal_type="sheep",
                tag_number="KHSI-2025-001",
                birth_type="Sg",
                breeding_type="Nat",
                genotype="RR",
                date_of_birth="2023-03-15",
                sex="R",
                sire_name="Champion Ram",
                sire_tag="KHSI-2022-045",
                dam_name="Foundation Ewe",
                dam_tag="KHSI-2022-012",
                registration_number="KHSI-001-2025",
                flock_id="SHILOH-001",
                coat_type="A",
                blood_percentage=100.0,
                inspected=True,
                weight=180.0,
                color="White",
                bloodline="Pure Katahdin",
                price=450.0,
                status="available",
                photos=["katahdin-ram.jpg"],
                description="Purebred Katahdin ram, excellent conformation and temperament. Ready for breeding season.",
                health_records="Vaccinated and dewormed. No health issues."
            ),
            Livestock(
                animal_type="sheep",
                tag_number="KHSI-2025-002",
                birth_type="Tw",
                breeding_type="Nat",
                genotype="RR",
                date_of_birth="2023-04-22",
                sex="E",
                sire_name="Elite Ram",
                sire_tag="KHSI-2022-078",
                dam_name="Production Ewe",
                dam_tag="KHSI-2022-034",
                registration_number="KHSI-002-2025",
                flock_id="SHILOH-001",
                coat_type="A",
                blood_percentage=100.0,
                inspected=True,
                weight=145.0,
                color="White with black spots",
                bloodline="Pure Katahdin",
                price=380.0,
                status="available",
                photos=["katahdin_ewe_2.jpg"],
                description="Registered Katahdin ewe with proven production record. Excellent mothering ability.",
                health_records="Complete vaccination history. Bred to our champion ram."
            ),
            Livestock(
                animal_type="sheep",
                tag_number="KHSI-2025-003",
                birth_type="Sg",
                breeding_type="Nat",
                genotype="RR",
                date_of_birth="2023-02-10",
                sex="R",
                sire_name="Foundation Ram",
                sire_tag="KHSI-2021-056",
                dam_name="Elite Ewe",
                dam_tag="KHSI-2021-023",
                registration_number="KHSI-003-2025",
                flock_id="SHILOH-001",
                coat_type="A",
                blood_percentage=100.0,
                inspected=True,
                weight=195.0,
                color="Solid white",
                bloodline="Pure Katahdin",
                price=520.0,
                status="available",
                photos=["katahdin-ram-2.jpg"],
                description="Large-framed Katahdin ram with superior genetics. Perfect for flock improvement.",
                health_records="Premium health program. Ready for immediate service."
            ),
            Livestock(
                animal_type="chicken",
                tag_number="CHICK-2025-001",
                birth_type="Nat",
                breeding_type="Nat",
                genotype="N/A",
                date_of_birth="2024-01-15",
                sex="F",
                sire_name="N/A",
                sire_tag="N/A",
                dam_name="N/A",
                dam_tag="N/A",
                registration_number="CHICK-001-2025",
                flock_id="SHILOH-CHICK",
                coat_type="N/A",
                blood_percentage=100.0,
                inspected=True,
                weight=6.0,
                color="Rhode Island Red",
                bloodline="Heritage Rhode Island Red",
                price=25.0,
                status="available",
                photos=["rhode-island-red.jpg"],
                description="Heritage Rhode Island Red hen, excellent layer with rich brown eggs. Great for homestead flocks.",
                health_records="Vaccinated and healthy. Excellent egg production."
            ),
            Livestock(
                animal_type="chicken",
                tag_number="CHICK-2025-002",
                birth_type="Nat",
                breeding_type="Nat",
                genotype="N/A",
                date_of_birth="2024-02-20",
                sex="F",
                sire_name="N/A",
                sire_tag="N/A",
                dam_name="N/A",
                dam_tag="N/A",
                registration_number="CHICK-002-2025",
                flock_id="SHILOH-CHICK",
                coat_type="N/A",
                blood_percentage=100.0,
                inspected=True,
                weight=5.5,
                color="Ameraucana",
                bloodline="Heritage Ameraucana",
                price=30.0,
                status="available",
                photos=["amerauca.jpg"],
                description="Ameraucana hen, known for beautiful blue eggs and friendly temperament. Perfect for backyard flocks.",
                health_records="Complete health check. Blue egg layer."
            ),
            Livestock(
                animal_type="dog",
                tag_number="PYRE-2025-001",
                birth_type="Nat",
                breeding_type="Nat",
                genotype="N/A",
                date_of_birth="2022-06-10",
                sex="M",
                sire_name="Guardian Male",
                sire_tag="PYRE-2020-045",
                dam_name="Foundation Female",
                dam_tag="PYRE-2020-012",
                registration_number="PYRE-001-2025",
                flock_id="SHILOH-GUARD",
                coat_type="N/A",
                blood_percentage=100.0,
                inspected=True,
                weight=120.0,
                color="White with gray patches",
                bloodline="Pure Great Pyrenees",
                price=800.0,
                status="available",
                photos=["great-pyrenees-male.jpg"],
                description="Purebred Great Pyrenees male, excellent guardian temperament. Trained for livestock protection.",
                health_records="AKC registered. Health tested. Excellent guardian instincts."
            ),
            Livestock(
                animal_type="dog",
                tag_number="PYRE-2025-002",
                birth_type="Nat",
                breeding_type="Nat",
                genotype="N/A",
                date_of_birth="2022-08-15",
                sex="F",
                sire_name="Elite Guardian",
                sire_tag="PYRE-2020-078",
                dam_name="Working Female",
                dam_tag="PYRE-2020-034",
                registration_number="PYRE-002-2025",
                flock_id="SHILOH-GUARD",
                coat_type="N/A",
                blood_percentage=100.0,
                inspected=True,
                weight=110.0,
                color="Solid white",
                bloodline="Pure Great Pyrenees",
                price=750.0,
                status="available",
                photos=["great-pyrenees-female.jpg"],
                description="Purebred Great Pyrenees female, proven guardian with gentle temperament around children.",
                health_records="AKC registered. Excellent working lineage. Ready for breeding."
            ),
            Livestock(
                animal_type="dog",
                tag_number="PYRE-2025-003",
                birth_type="Nat",
                breeding_type="Nat",
                genotype="N/A",
                date_of_birth="2024-04-01",
                sex="M",
                sire_name="PYRE-2025-001",
                sire_tag="PYRE-2025-001",
                dam_name="PYRE-2025-002",
                dam_tag="PYRE-2025-002",
                registration_number="PYRE-PUP-001-2025",
                flock_id="SHILOH-GUARD",
                coat_type="N/A",
                blood_percentage=100.0,
                inspected=True,
                weight=35.0,
                color="White with gray markings",
                bloodline="Pure Great Pyrenees",
                price=400.0,
                status="available",
                photos=["pyrenees-pup.jpg"],
                description="Great Pyrenees pup from our working guardian line. 12 weeks old, started on socialization and basic training.",
                health_records="Vaccinated, dewormed, and health checked. Ready for new home."
            )
        ]
        
        for livestock in default_livestock:
            doc = livestock.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.livestock.insert_one(doc)

# Auth routes
@api_router.post("/auth/login", response_model=Token)
async def login(credentials: AdminLogin):
    admin = await db.admin_users.find_one({"username": credentials.username})
    if not admin or not pwd_context.verify(credentials.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": credentials.username})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/verify")
async def verify(username: str = Depends(verify_token)):
    return {"username": username}

# Livestock routes
@api_router.post("/livestock", response_model=Livestock)
async def create_livestock(livestock: LivestockCreate, username: str = Depends(verify_token)):
    livestock_obj = Livestock(**livestock.model_dump())
    doc = livestock_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.livestock.insert_one(doc)
    return livestock_obj

@api_router.get("/livestock", response_model=List[Livestock])
async def get_all_livestock():
    livestock = await db.livestock.find({}, {"_id": 0}).to_list(1000)
    for item in livestock:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    return livestock

@api_router.get("/livestock/{livestock_id}", response_model=Livestock)
async def get_livestock(livestock_id: str):
    livestock = await db.livestock.find_one({"id": livestock_id}, {"_id": 0})
    if not livestock:
        raise HTTPException(status_code=404, detail="Livestock not found")
    if isinstance(livestock.get('created_at'), str):
        livestock['created_at'] = datetime.fromisoformat(livestock['created_at'])
    if isinstance(livestock.get('updated_at'), str):
        livestock['updated_at'] = datetime.fromisoformat(livestock['updated_at'])
    return livestock

@api_router.put("/livestock/{livestock_id}", response_model=Livestock)
async def update_livestock(livestock_id: str, livestock: LivestockCreate, username: str = Depends(verify_token)):
    existing = await db.livestock.find_one({"id": livestock_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Livestock not found")
    update_data = livestock.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.livestock.update_one({"id": livestock_id}, {"$set": update_data})
    updated = await db.livestock.find_one({"id": livestock_id}, {"_id": 0})
    if updated:
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        return updated
    else:
        raise HTTPException(status_code=404, detail="Livestock not found after update")

@api_router.delete("/livestock/{livestock_id}")
async def delete_livestock(livestock_id: str, username: str = Depends(verify_token)):
    result = await db.livestock.delete_one({"id": livestock_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Livestock not found")
    return {"message": "Livestock deleted successfully"}

# Contact routes
# Dedicated transfer contact form endpoint
@api_router.post("/contact/transfer", response_model=TransferContactForm)
async def create_transfer_contact(form: TransferContactForm):
    # Optionally, store in a separate collection or reuse contact_forms with a type
    doc = form.model_dump()
    doc['created_at'] = datetime.now(timezone.utc).isoformat()
    doc['inquiry_type'] = "transfer"
    await db.contact_forms.insert_one(doc)
    return form
@api_router.post("/contact", response_model=ContactForm)
async def create_contact(contact: ContactFormCreate):
    contact_obj = ContactForm(**contact.model_dump())
    doc = contact_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contact_forms.insert_one(doc)
    return contact_obj

@api_router.get("/contact", response_model=List[ContactForm])
async def get_all_contacts(username: str = Depends(verify_token)):
    contacts = await db.contact_forms.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    return contacts

@api_router.patch("/contact/{contact_id}/status")
async def update_contact_status(contact_id: str, status: str, username: str = Depends(verify_token)):
    await db.contact_forms.update_one({"id": contact_id}, {"$set": {"status": status}})
    return {"message": "Status updated"}

# About routes
@api_router.get("/about", response_model=AboutContent)
async def get_about():
    about = await db.about_content.find_one({"id": "about_page"}, {"_id": 0})
    if not about:
        raise HTTPException(status_code=404, detail="About page not found")
    if isinstance(about.get('updated_at'), str):
        about['updated_at'] = datetime.fromisoformat(about['updated_at'])
    return about

@api_router.put("/about", response_model=AboutContent)
async def update_about(content: AboutContentUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in content.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.about_content.update_one({"id": "about_page"}, {"$set": update_data})
    updated = await db.about_content.find_one({"id": "about_page"}, {"_id": 0})
    if updated:
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        return updated
    else:
        raise HTTPException(status_code=404, detail="About page not found after update")

# Blog routes
@api_router.get("/blog", response_model=BlogContent)
async def get_blog():
    blog = await db.blog_content.find_one({"id": "blog_page"}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog page not found")
    if isinstance(blog.get('updated_at'), str):
        blog['updated_at'] = datetime.fromisoformat(blog['updated_at'])
    return blog

@api_router.put("/blog", response_model=BlogContent)
async def update_blog(content: BlogContentUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in content.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.blog_content.update_one({"id": "blog_page"}, {"$set": update_data})
    updated = await db.blog_content.find_one({"id": "blog_page"}, {"_id": 0})
    if updated:
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        return updated
    else:
        raise HTTPException(status_code=404, detail="Blog page not found after update")

# Settings routes
@api_router.get("/settings", response_model=Settings)
async def get_settings(username: str = Depends(verify_token)):
    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return settings

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings: SettingsUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one({"id": "site_settings"}, {"$set": update_data})
    updated = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    if updated:
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        return updated
    else:
        raise HTTPException(status_code=404, detail="Settings not found after update")

# NFT routes
@api_router.post("/nft/mint", response_model=NFTRecord)
async def mint_nft(request: NFTMintRequest, username: str = Depends(verify_token)):
    # Verify livestock exists
    livestock = await db.livestock.find_one({"id": request.livestock_id})
    if not livestock:
        raise HTTPException(status_code=404, detail="Livestock not found")
    
    # Create NFT record
    nft_record = NFTRecord(
        livestock_id=request.livestock_id,
        status="pending"
    )
    doc = nft_record.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.nft_records.insert_one(doc)
    
    # Update livestock NFT status
    await db.livestock.update_one(
        {"id": request.livestock_id},
        {"$set": {"nft_minted": True}}
    )
    
    return nft_record

@api_router.get("/nft", response_model=List[NFTRecord])
async def get_nft_records(username: str = Depends(verify_token)):
    records = await db.nft_records.find({}, {"_id": 0}).to_list(1000)
    for record in records:
        if isinstance(record.get('created_at'), str):
            record['created_at'] = datetime.fromisoformat(record['created_at'])
        if isinstance(record.get('updated_at'), str):
            record['updated_at'] = datetime.fromisoformat(record['updated_at'])
    return records

@api_router.get("/nft/{nft_id}", response_model=NFTRecord)
async def get_nft_record(nft_id: str, username: str = Depends(verify_token)):
    record = await db.nft_records.find_one({"id": nft_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="NFT record not found")
    if isinstance(record.get('created_at'), str):
        record['created_at'] = datetime.fromisoformat(record['created_at'])
    if isinstance(record.get('updated_at'), str):
        record['updated_at'] = datetime.fromisoformat(record['updated_at'])
    return record

# Product routes
@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, username: str = Depends(verify_token)):
    product_obj = Product(**product.model_dump())
    doc = product_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.products.insert_one(doc)
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_all_products():
    products = await db.products.find({"is_available": True}, {"_id": 0}).to_list(1000)
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        if isinstance(product.get('updated_at'), str):
            product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    if isinstance(product.get('updated_at'), str):
        product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductCreate, username: str = Depends(verify_token)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    update_data = product.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if updated:
        if isinstance(updated.get('created_at'), str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        return updated
    else:
        raise HTTPException(status_code=404, detail="Product not found after update")

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, username: str = Depends(verify_token)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# Order routes
@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    # Calculate total amount and resolve cut/pricing selections
    total_amount = 0.0
    stored_items: List[Dict[str, Any]] = []

    for item in order.order_items:
        # item is an OrderItem (Pydantic)
        product = await db.products.find_one({"id": item.product_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if not product.get("is_available", True):
            raise HTTPException(status_code=400, detail=f"Product {product.get('name')} is not available")

        price_per_unit: Optional[float] = None

        # If product defines cuts, require a cut selection and pick tiered pricing
        if product.get("cuts"):
            if not item.cut:
                raise HTTPException(status_code=400, detail=f"Product {product.get('name')} requires a cut selection")
            cuts = product.get("cuts", {})
            cut_info = cuts.get(item.cut)
            if not cut_info:
                raise HTTPException(status_code=400, detail=f"Cut '{item.cut}' not available for product {product.get('name')}")
            pricing_tier = item.pricing_tier if item.pricing_tier in ["normalized", "premium"] else "normalized"
            price_per_unit = cut_info.get(pricing_tier) or cut_info.get("normalized")
        else:
            # Fallback to product-level price
            price_per_unit = product.get("price_per_unit")
            if price_per_unit is None:
                raise HTTPException(status_code=400, detail=f"Product {product.get('name')} has no price set")

        subtotal = price_per_unit * item.quantity
        total_amount += subtotal

        # store resolved item data
        item_dict = item.model_dump() if hasattr(item, "model_dump") else item.dict()
        item_dict["price_per_unit"] = price_per_unit
        stored_items.append(item_dict)

    # Build order object for storage/response
    order_data = order.model_dump()
    order_data["order_items"] = stored_items
    order_data["total_amount"] = total_amount

    order_obj = Order(**order_data)
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.orders.insert_one(doc)
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_all_orders(username: str = Depends(verify_token)):
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, username: str = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if isinstance(order.get('updated_at'), str):
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, username: str = Depends(verify_token)):
    valid_statuses = ["pending", "confirmed", "processing", "ready", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"id": order_id}, 
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": f"Order status updated to {status}"}

# Documents endpoints
@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = None,
    description: str = None,
    category: str = "other",
    is_public: bool = True,
    username: str = Depends(verify_token)
):
    # Validate category
    valid_categories = ["certificates", "reports", "applications", "other"]
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    # Read file content
    content = await file.read()
    
    # Create documents directory if it doesn't exist
    docs_dir = ROOT_DIR / "documents"
    docs_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = docs_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create document record
    doc_data = {
        "title": title or file.filename,
        "filename": file.filename,
        "description": description,
        "category": category,
        "file_path": f"documents/{unique_filename}",
        "file_size": len(content),
        "mime_type": file.content_type,
        "is_public": is_public,
        "uploaded_by": username,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    doc = Document(**doc_data)
    doc_dict = doc.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    doc_dict['updated_at'] = doc_dict['updated_at'].isoformat()
    
    result = await db.documents.insert_one(doc_dict)
    doc_dict['id'] = str(result.inserted_id)
    
    return doc

@api_router.get("/documents", response_model=List[Document])
async def get_all_documents(username: str = Depends(verify_token)):
    documents = await db.documents.find({}, {"_id": 0}).to_list(1000)
    for doc in documents:
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        if isinstance(doc.get('updated_at'), str):
            doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    return documents

@api_router.get("/documents/public", response_model=List[Document])
async def get_public_documents():
    documents = await db.documents.find({"is_public": True}, {"_id": 0}).to_list(1000)
    for doc in documents:
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        if isinstance(doc.get('updated_at'), str):
            doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    return documents

@api_router.get("/documents/{document_id}", response_model=Document)
async def get_document(document_id: str, username: str = Depends(verify_token)):
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if isinstance(document.get('created_at'), str):
        document['created_at'] = datetime.fromisoformat(document['created_at'])
    if isinstance(document.get('updated_at'), str):
        document['updated_at'] = datetime.fromisoformat(document['updated_at'])
    return document

@api_router.put("/documents/{document_id}")
async def update_document(document_id: str, doc_update: dict, username: str = Depends(verify_token)):
    # Validate category if provided
    if 'category' in doc_update:
        valid_categories = ["certificates", "reports", "applications", "other"]
        if doc_update['category'] not in valid_categories:
            raise HTTPException(status_code=400, detail="Invalid category")
    
    doc_update['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.documents.update_one(
        {"id": document_id}, 
        {"$set": doc_update}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document updated successfully"}

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, username: str = Depends(verify_token)):
    # Get document info first
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from filesystem
    file_path = ROOT_DIR / document['file_path']
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.documents.delete_one({"id": document_id})
    return {"message": "Document deleted successfully"}

@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str):
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if document is public
    if not document.get('is_public', False):
        raise HTTPException(status_code=403, detail="Document is not publicly available")
    
    file_path = ROOT_DIR / document['file_path']
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=document['filename'],
        media_type=document['mime_type']
    )

# Mock ticker data
@api_router.get("/ticker")
async def get_ticker_data():
    return {
        "sheep": {"price": 2.85, "change": 0.05, "updated": datetime.now(timezone.utc).isoformat()},
        "hog": {"price": 95.50, "change": -1.25, "updated": datetime.now(timezone.utc).isoformat()},
        "cattle": {"price": 185.75, "change": 2.30, "updated": datetime.now(timezone.utc).isoformat()}
    }

# Image upload
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), username: str = Depends(verify_token)):
    # Read file content
    content = await file.read()
    # Convert to base64
    base64_image = base64.b64encode(content).decode('utf-8')
    # Return data URL
    return {"url": f"data:{file.content_type};base64,{base64_image}"}

# Include router
app.include_router(api_router)

# Mount static files
from fastapi.staticfiles import StaticFiles
app.mount("/images", StaticFiles(directory=ROOT_DIR.parent / "assets" / "images"), name="images")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()