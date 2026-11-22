import uuid
from fastapi import Request, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import NLP_API_KEY, API_KEY_HEADER_NAME
from app.core.logging_config import structured_logger
from app.core.metrics import metrics

api_key_header = APIKeyHeader(name=API_KEY_HEADER_NAME, auto_error=False)

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = req_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            metrics.record_error()
            req_id = getattr(request.state, "request_id", "unknown")
            structured_logger.error(
                f"Unhandled exception processing {request.method} {request.url.path}: {str(exc)}",
                exc_info=True,
                extra={"request_id": req_id}
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": "InternalServerError",
                    "message": "An unexpected error occurred processing your request.",
                    "request_id": req_id
                }
            )

async def verify_api_key(header_key: str = Security(api_key_header)):
    """Validates X-API-Key header. If no key configured in env, allow access."""
    if not NLP_API_KEY:
        return True
    if not header_key or header_key != NLP_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing X-API-Key authentication header."
        )
    return True

