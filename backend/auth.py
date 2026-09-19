from fastapi import Header, HTTPException
from security import verify_api_key


def require_api_key(x_api_key: str | None = Header(default=None)) -> str:
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key"
        )

    if not verify_api_key(x_api_key):
        raise HTTPException(
            status_code=403,
            detail="Invalid API key"
        )

    return x_api_key
