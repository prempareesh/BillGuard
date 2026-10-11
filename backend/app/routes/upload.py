import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from ..schemas import PresignedUploadRequest, PresignedUploadResponse
from ..s3_service import s3_service

router = APIRouter(prefix="/api/upload", tags=["upload"])

@router.post("/presign", response_model=PresignedUploadResponse)
async def get_presigned_upload(req: PresignedUploadRequest):
    """
    Generates S3 presigned URL for secure direct client-to-S3 document upload.
    Falls back to server-side endpoint if AWS credentials are not configured.
    """
    # Enforce allowed extensions: PDF, JPG, JPEG, PNG
    ext = os.path.splitext(req.filename)[1].lower()
    if ext not in [".pdf", ".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported document format. Allowed formats: PDF, JPG, JPEG, PNG.",
        )

    # 15 MB file size limit and non-empty check
    if req.file_size_bytes <= 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty (0 bytes). Please upload a valid electricity bill.",
        )

    if req.file_size_bytes > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds maximum permitted limit (15MB).",
        )

    url, key, is_local = s3_service.generate_presigned_upload(
        req.filename, req.content_type
    )

    return PresignedUploadResponse(
        upload_url=url,
        object_key=key,
        bucket=s3_service.bucket_name,
        direct_upload_fallback=is_local,
    )

@router.post("/direct")
async def direct_upload_file(
    file: UploadFile = File(...),
    key: str = Query(...)
):
    """Direct upload fallback to local storage when S3 is running in local mode."""
    if ".." in key or key.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid storage key path.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    path = s3_service.save_file_locally(key, content)
    return {"success": True, "object_key": key, "local_path": path}

