"""Safely create/update an admin without accepting a plaintext CLI argument."""
import asyncio
import getpass
import os
import uuid
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext


async def main():
    email = input("Admin email: ").strip().lower()
    password = getpass.getpass("Admin password: ")
    if "@" not in email or len(password) < 12:
        raise SystemExit("A valid email and password of at least 12 characters are required.")
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://root:example@127.0.0.1:27017/shiloh_farm?authSource=admin"))
    database = client[os.environ.get("DB_NAME", "shiloh_farm")]
    context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    await database.admin_users.update_one(
        {"username": email},
        {"$set": {"username": email, "password_hash": context.hash(password), "updated_at": datetime.now(timezone.utc).isoformat()}, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    print(f"Admin credential updated for {email}.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

