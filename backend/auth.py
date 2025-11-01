from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
import jwt
import os

security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET', 'shiloh-ridge-farm-secret-key-2025')
ALGORITHM = "HS256"

def verify_token(credentials = Depends(security)):
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