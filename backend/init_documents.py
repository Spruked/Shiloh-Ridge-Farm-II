#!/usr/bin/env python3
"""
Initialize documents in the database from the documents directory.
Run this after starting the backend to populate the documents collection.
"""

import os
import asyncio
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://admin:password@localhost:27017/shilohridgefarm?authSource=admin')
DB_NAME = os.environ.get('DB_NAME', 'shilohridgefarm')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Document metadata mapping
DOCUMENT_METADATA = {
    "2019_11_ChristenedNamesList.pdf": {
        "title": "2019 Christened Names List",
        "description": "List of christened names for Katahdin sheep born in 2019",
        "category": "reports"
    },
    "AI-ET-Certificate-10.25-FINAL.pdf": {
        "title": "AI/ET Certificate - October 2025",
        "description": "Artificial Insemination and Embryo Transfer certificate for Katahdin sheep breeding program",
        "category": "certificates"
    },
    "Breeding-Certificate-4.25-FINAL.pdf": {
        "title": "Breeding Certificate - April 2025",
        "description": "Official breeding certificate for Katahdin sheep registration",
        "category": "certificates"
    },
    "content.pdf": {
        "title": "Farm Content Document",
        "description": "General farm content and information document",
        "category": "other"
    },
    "KHSI_HairCoatInspection_Report.pdf": {
        "title": "KHSI Hair Coat Inspection Report",
        "description": "Official Katahdin Hair Sheep International hair coat inspection report",
        "category": "reports"
    },
    "KHSI_Livestock_Export.pdf": {
        "title": "KHSI Livestock Export Document",
        "description": "Livestock export documentation for Katahdin sheep",
        "category": "reports"
    },
    "Reg-App-4.25-FINAL-2.pdf": {
        "title": "Registration Application - April 2025",
        "description": "Katahdin sheep registration application form",
        "category": "applications"
    },
    "Work-Order-4.25-FINAL.pdf": {
        "title": "Work Order - April 2025",
        "description": "Farm work order and maintenance documentation",
        "category": "other"
    }
}

def get_mime_type(filename):
    """Get MIME type based on file extension"""
    if filename.lower().endswith('.pdf'):
        return 'application/pdf'
    return 'application/octet-stream'

async def initialize_documents():
    """Initialize document records in the database"""

    documents_dir = Path(__file__).parent / "documents"

    if not documents_dir.exists():
        print(f"Documents directory not found: {documents_dir}")
        return

    for filename in os.listdir(documents_dir):
        if filename in DOCUMENT_METADATA:
            file_path = documents_dir / filename
            metadata = DOCUMENT_METADATA[filename]

            # Check if document already exists
            existing = await db.documents.find_one({"filename": filename})
            if existing:
                print(f"Document {filename} already exists, skipping...")
                continue

            # Create document record
            doc_data = {
                "id": str(uuid.uuid4()),
                "title": metadata["title"],
                "filename": filename,
                "description": metadata["description"],
                "category": metadata["category"],
                "file_path": f"documents/{filename}",
                "file_size": file_path.stat().st_size,
                "mime_type": get_mime_type(filename),
                "is_public": True,
                "uploaded_by": "system",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }

            await db.documents.insert_one(doc_data)
            print(f"Added document: {metadata['title']}")

    print("Document initialization complete!")

if __name__ == "__main__":
    asyncio.run(initialize_documents())