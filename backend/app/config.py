import os
from pathlib import Path
from pydantic import BaseModel

# Automatically load local .env.local or .env if present in development
try:
    from dotenv import load_dotenv
    root_dir = Path(__file__).resolve().parent.parent.parent
    if (root_dir / ".env.local").exists():
        load_dotenv(root_dir / ".env.local")
    elif (root_dir / ".env").exists():
        load_dotenv(root_dir / ".env")
    backend_env = Path(__file__).resolve().parent.parent / ".env"
    if backend_env.exists():
        load_dotenv(backend_env)
    if "AWS_DEFAULT_REGION" not in os.environ and "AWS_REGION" in os.environ:
        os.environ["AWS_DEFAULT_REGION"] = os.environ["AWS_REGION"]
except Exception:
    pass

class Settings(BaseModel):
    app_name: str = "BillGuard API"
    environment: str = os.getenv("ENVIRONMENT", "development")
    aws_region: str = os.getenv("AWS_REGION", "ap-southeast-2")
    s3_bucket_name: str = os.getenv("S3_BUCKET_NAME", "billguard-documents-pream-2026")
    dynamodb_table_name: str = os.getenv("DYNAMODB_TABLE_NAME", "BillGuardAudits")
    # Strictly read from environment variable - never fall back to hardcoded secrets
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # Local fallback is only enabled in development or when explicitly enabled
    @property
    def is_local_fallback_enabled(self) -> bool:
        env_override = os.getenv("LOCAL_FALLBACK_ENABLED")
        if env_override is not None:
            return env_override.lower() in ("true", "1", "yes")
        return self.environment != "production"

    @property
    def cors_origins(self) -> list[str]:
        raw = os.getenv("CORS_ORIGINS", "")
        origins: list[str] = []
        if raw.strip():
            origins.extend([origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()])

        # Standard allowed origins
        defaults = [
            "https://main.d3nztc0st9o9ku.amplifyapp.com",
            "https://billguard.app",
            "https://api.billguard.app",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins

settings = Settings()

