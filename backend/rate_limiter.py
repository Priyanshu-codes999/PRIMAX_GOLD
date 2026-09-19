import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


REQUEST_LIMIT = 60
WINDOW_SECONDS = 60

_requests = defaultdict(deque)


def rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    timestamps = _requests[client_ip]

    while timestamps and now - timestamps[0] > WINDOW_SECONDS:
        timestamps.popleft()

    if len(timestamps) >= REQUEST_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again later."
        )

    timestamps.append(now)
