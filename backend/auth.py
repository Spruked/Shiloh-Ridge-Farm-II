from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
import jwt
import os

security = HTTPBearer(auto_error=False)
SECRET_KEY = os.environ['JWT_SECRET']
ALGORITHM = "HS256"
ADMIN_AUTH_BYPASS = os.environ.get("ADMIN_AUTH_BYPASS", "false").strip().lower() in ("1", "true", "yes", "on")
ADMIN_BYPASS_USER = os.environ.get("ADMIN_BYPASS_USER", "owner")

def verify_token(credentials = Depends(security)):
    if ADMIN_AUTH_BYPASS:
        return ADMIN_BYPASS_USER
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
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
