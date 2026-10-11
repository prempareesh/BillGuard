import os
import uuid
import re
import logging
from typing import Optional, Tuple
from pathlib import Path
from fastapi import HTTPException
from .config import settings

logger = logging.getLogger(__name__)

LOCAL_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "uploads"
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class S3Service:
    def __init__(self):
        self.bucket_name = settings.s3_bucket_name
        self.region = settings.aws_region
        self.s3_client = None

        # Allow Boto3 standard credential provider chain (IAM Roles, ECS Task Roles, App Runner Instance Roles, Env vars)
        try:
            import boto3
            from botocore.config import Config
            s3_config = Config(
                region_name=self.region,
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
            )
            session = boto3.Session(region_name=self.region)
            self.s3_client = session.client("s3", region_name=self.region, config=s3_config)
        except Exception as e:
            logger.warning(f"Boto3 S3 client could not be initialized: {e}")
            self.s3_client = None

    def generate_presigned_upload(
        self, filename: str, content_type: str
    ) -> Tuple[str, str, bool]:
        """
        Generates S3 presigned PUT URL using IAM credentials or standard provider chain.
        Returns: (upload_url, s3_object_key, is_local_fallback)
        """
        safe_ext = os.path.splitext(filename)[1].lower() or ".pdf"
        sanitized_base = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.splitext(filename)[0])[:30]
        unique_key = f"bills/{uuid.uuid4().hex}_{sanitized_base}{safe_ext}"

        if self.s3_client:
            try:
                url = self.s3_client.generate_presigned_url(
                    ClientMethod="put_object",
                    Params={
                        "Bucket": self.bucket_name,
                        "Key": unique_key,
                        "ContentType": content_type,
                    },
                    ExpiresIn=900,  # 15-minute secure expiration
                )
                return url, unique_key, False
            except Exception as e:
                logger.warning(f"AWS S3 presigned URL generation failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="AWS S3 presigned upload generation failed in production environment.",
                    )

        if not settings.is_local_fallback_enabled:
            raise HTTPException(
                status_code=503,
                detail="AWS S3 is not configured and local storage fallback is disabled in production.",
            )

        # Local development fallback URL
        upload_url = f"/api/upload/direct?key={unique_key}"
        return upload_url, unique_key, True

    def save_file_locally(self, key: str, file_bytes: bytes) -> str:
        """Saves file to S3 or local storage fallback."""
        if self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=file_bytes,
                    ContentType="application/pdf" if key.endswith(".pdf") else "image/jpeg",
                    ServerSideEncryption="AES256",
                )
                return key
            except Exception as e:
                logger.warning(f"Direct S3 upload failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to save document to Amazon S3 in production environment.",
                    )

        if not settings.is_local_fallback_enabled:
            raise HTTPException(
                status_code=503,
                detail="Amazon S3 is unreachable and local storage fallback is disabled in production.",
            )

        safe_filename = os.path.basename(key)
        file_path = LOCAL_STORAGE_DIR / safe_filename
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return str(file_path)

    def get_file_bytes(self, key: str) -> Optional[bytes]:
        """Retrieves document bytes from S3 or local storage fallback."""
        if self.s3_client:
            try:
                response = self.s3_client.get_object(
                    Bucket=self.bucket_name, Key=key
                )
                return response["Body"].read()
            except Exception as e:
                logger.warning(f"AWS S3 get_object failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Could not retrieve document from Amazon S3 in production environment.",
                    )

        safe_filename = os.path.basename(key)
        local_path = LOCAL_STORAGE_DIR / safe_filename
        if local_path.exists():
            with open(local_path, "rb") as f:
                return f.read()
        return None

    def delete_file(self, key: str) -> bool:
        """Safely removes bill document from S3 and local storage."""
        deleted = False
        if self.s3_client and key:
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
                deleted = True
            except Exception as e:
                logger.warning(f"AWS S3 delete_object failed: {type(e).__name__}")

        if key:
            safe_filename = os.path.basename(key)
            local_path = LOCAL_STORAGE_DIR / safe_filename
            if local_path.exists():
                try:
                    local_path.unlink()
                    deleted = True
                except Exception as e:
                    logger.warning(f"Local file deletion error: {e}")
        return deleted

    def check_connection(self) -> dict:
        """
        Validates connection to the target S3 bucket in ap-southeast-2.
        Returns a diagnostic dictionary without exposing credentials.
        """
        if not self.s3_client:
            return {
                "bucket": self.bucket_name,
                "region": self.region,
                "connected": False,
                "status": "client_not_initialized",
                "message": "AWS S3 client could not be initialized.",
            }

        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return {
                "bucket": self.bucket_name,
                "region": self.region,
                "connected": True,
                "status": "connected",
                "message": f"Successfully connected to S3 bucket '{self.bucket_name}'.",
            }
        except Exception as e:
            err_code = getattr(e, "response", {}).get("Error", {}).get("Code", type(e).__name__)
            return {
                "bucket": self.bucket_name,
                "region": self.region,
                "connected": False,
                "status": "connection_failed",
                "error_code": err_code,
                "message": f"Cannot reach S3 bucket '{self.bucket_name}': {err_code}",
            }

s3_service = S3Service()

