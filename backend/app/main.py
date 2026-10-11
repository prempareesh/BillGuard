import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routes import upload, ocr, tariff, ai, records

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="BillGuard APERC Electricity Bill Auditing and Consumer Grievance Platform Backend (AWS + FastAPI)",
)

# In-memory sliding window rate limiter (60 requests per minute per IP)
_RATE_LIMITS = {}
_WINDOW_SECONDS = 60
_MAX_REQUESTS_PER_WINDOW = 60

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Only rate limit API mutation/AI endpoints
    path = request.url.path
    if path.startswith("/api/"):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        
        # Clean up expired entries periodically
        if client_ip in _RATE_LIMITS:
            reqs = [t for t in _RATE_LIMITS[client_ip] if now - t < _WINDOW_SECONDS]
            if len(reqs) >= _MAX_REQUESTS_PER_WINDOW:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please wait a moment before trying again."},
                    headers={"Retry-After": "60"},
                )
            reqs.append(now)
            _RATE_LIMITS[client_ip] = reqs
        else:
            _RATE_LIMITS[client_ip] = [now]

    response = await call_next(request)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include Modular Routers
app.include_router(upload.router)
app.include_router(ocr.router)
app.include_router(tariff.router)
app.include_router(ai.router)
app.include_router(records.router)


@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "BillGuard FastAPI",
        "aws_region": settings.aws_region,
        "s3_bucket": settings.s3_bucket_name,
        "dynamodb_table": settings.dynamodb_table_name,
        "local_fallback_active": settings.is_local_fallback_enabled,
        "architecture": {
            "database": "Amazon DynamoDB",
            "storage": "Amazon S3",
            "dynamodb_table": settings.dynamodb_table_name,
            "s3_bucket": settings.s3_bucket_name,
            "region": settings.aws_region,
            "tariff_engine": "APERC Deterministic (Python)",
            "ai_integration": "Google Gemini Server-Side",
            "backend_hosting": "AWS App Runner / ECS",
            "frontend_hosting": "AWS Amplify",
        },
    }

@app.get("/api/aws/status")
async def get_aws_status():
    """
    Live connectivity diagnostics for Amazon S3 and Amazon DynamoDB resources.
    Never exposes secret credentials or sensitive tokens.
    """
    from .s3_service import s3_service
    from .dynamo_service import dynamo_service

    s3_status = s3_service.check_connection()
    dynamo_status = dynamo_service.check_connection()

    overall_connected = s3_status.get("connected", False) and dynamo_status.get("connected", False)

    return {
        "configured_region": settings.aws_region,
        "overall_aws_connected": overall_connected,
        "local_fallback_active": settings.is_local_fallback_enabled,
        "s3": s3_status,
        "dynamodb": dynamo_status,
    }
