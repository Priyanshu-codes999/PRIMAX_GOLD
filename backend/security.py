import hashlib
import hmac
import os

API_KEY_HASH = os.getenv("HFT_API_KEY_HASH", "")


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(api_key: str) -> bool:
    if not API_KEY_HASH:
        return False

    provided_hash = hash_api_key(api_key)

    return hmac.compare_digest(provided_hash, API_KEY_HASH)
