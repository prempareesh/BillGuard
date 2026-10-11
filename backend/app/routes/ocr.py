import os
import re
import uuid
import asyncio
import time
import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, Dict, Any
from ..schemas import OCRExtractResponse, ExtractedBillData
from ..s3_service import s3_service
from ..dynamo_service import dynamo_service
from ..gemini_service import gemini_service

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
VALID_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

def _sanitize_filename(filename: Optional[str]) -> str:
    base = filename or "statement.pdf"
    # Prevent path traversal and special characters
    safe = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.basename(base))
    return safe[:50] or "statement.pdf"

async def _process_ocr_job(job_id: str, file_bytes: bytes, mime_type: str, s3_key: Optional[str]):
    """Background task executing Gemini multimodal OCR and field validation with DynamoDB tracking."""
    try:
        dynamo_service.save_ocr_job(
            job_id,
            {
                "status": "processing",
                "stage": "Reading your statement",
                "document_s3_key": s3_key,
                "created_at": time.time(),
            },
        )

        extracted = await gemini_service.extract_bill_ocr(file_bytes, mime_type)
        
        dynamo_service.save_ocr_job(
            job_id,
            {
                "status": "processing",
                "stage": "Checking extracted details",
                "document_s3_key": s3_key,
                "created_at": time.time(),
            },
        )

        validation = gemini_service.validate_fields(extracted)

        dynamo_service.save_ocr_job(
            job_id,
            {
                "status": "completed",
                "stage": "Checking extracted details",
                "data": extracted.model_dump(),
                "validation": validation.model_dump(),
                "document_s3_key": s3_key,
                "created_at": time.time(),
            },
            ttl_seconds=3600,
        )
    except (asyncio.TimeoutError, httpx.TimeoutException) as e:
        dynamo_service.save_ocr_job(
            job_id,
            {
                "status": "failed",
                "stage": "Processing timed out",
                "error": "OCR extraction timed out after 35 seconds. Please ensure your document image is clear and try again.",
                "created_at": time.time(),
            },
            ttl_seconds=1800,
        )
    except RuntimeError as e:
        dynamo_service.save_ocr_job(
            job_id,
            {
                "status": "failed",
                "stage": "Configuration error",
                "error": str(e),
                "created_at": time.time(),
            },
            ttl_seconds=1800,
        )
    except Exception as e:
        dynamo_service.save_ocr_job(
            job_id,
            {
                "status": "failed",
                "stage": "Processing failed",
                "error": "Failed to extract electricity statement details. Please verify the document is a readable AP electricity bill.",
                "created_at": time.time(),
            },
            ttl_seconds=1800,
        )

@router.post("/start-job")
async def start_ocr_job(
    file: Optional[UploadFile] = File(None),
    s3_key: Optional[str] = Form(None),
):
    """Starts asynchronous OCR processing job trackable across multiple backend instances."""
    file_bytes = None
    mime_type = "application/pdf"

    if s3_key:
        file_bytes = s3_service.get_file_bytes(s3_key)
        ext = os.path.splitext(s3_key)[1].lower()
        if ext in [".jpg", ".jpeg"]:
            mime_type = "image/jpeg"
        elif ext == ".png":
            mime_type = "image/png"
        else:
            mime_type = "application/pdf"

    if not file_bytes and file:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded document is empty (0 bytes). Please upload a valid electricity bill.",
            )

        mime_type = file.content_type or "application/pdf"
        ext = os.path.splitext(file.filename or "doc.pdf")[1].lower()

        if ext not in VALID_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Please upload a PDF, JPG, JPEG, or PNG document.",
            )

        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 15MB limit. Please upload a smaller statement.",
            )

        safe_filename = _sanitize_filename(file.filename)
        key = f"bills/upload_{uuid.uuid4().hex[:12]}_{safe_filename}"
        s3_service.save_file_locally(key, file_bytes)
        s3_key = key

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Document content could not be located. Please provide file or valid S3 object key.",
        )

    job_id = f"job-{uuid.uuid4().hex[:16]}"
    job_record = {
        "status": "processing",
        "stage": "Reading your statement",
        "job_id": job_id,
        "document_s3_key": s3_key,
        "created_at": time.time(),
    }

    # Persist job record in DynamoDB for cross-instance discovery
    dynamo_service.save_ocr_job(job_id, job_record, ttl_seconds=3600)

    # Execute in background task so FastAPI never blocks
    asyncio.create_task(_process_ocr_job(job_id, file_bytes, mime_type, s3_key))

    return job_record

@router.get("/job/{job_id}")
async def get_ocr_job_status(job_id: str):
    """Retrieves status of an ongoing or completed OCR background job across instances."""
    job = dynamo_service.get_ocr_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="OCR job not found or expired.")
    return job

@router.post("/extract", response_model=OCRExtractResponse)
async def extract_bill_data(
    file: Optional[UploadFile] = File(None),
    s3_key: Optional[str] = Form(None),
    is_demo: Optional[bool] = Form(False),
):
    """
    Direct synchronous OCR extraction using server-side Gemini AI.
    Runs field validation and arithmetic sanity checks.
    """
    if is_demo:
        demo_data = ExtractedBillData(
            consumer_name="K. Raghunath Reddy",
            consumer_number="1429810342",
            service_number="NEL-04-12948",
            discom="APSPDCL",
            consumer_category="Domestic",
            billing_month="August 2026",
            units_consumed=320,
            bill_amount=2850,
            fixed_charges=30,
            taxes=19,
            fuel_adjustment_charges=48,
            previous_reading=14210,
            current_reading=14530,
            due_date="24-08-2026",
            is_demo=True,
        )
        validation = gemini_service.validate_fields(demo_data)
        return OCRExtractResponse(
            success=True,
            data=demo_data,
            validation=validation,
            document_s3_key=None,
            source="demo",
        )

    file_bytes = None
    mime_type = "application/pdf"

    if s3_key:
        file_bytes = s3_service.get_file_bytes(s3_key)
        ext = os.path.splitext(s3_key)[1].lower()
        if ext in [".jpg", ".jpeg"]:
            mime_type = "image/jpeg"
        elif ext == ".png":
            mime_type = "image/png"
        else:
            mime_type = "application/pdf"

    if not file_bytes and file:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded document is empty (0 bytes). Please upload a valid electricity bill.",
            )

        mime_type = file.content_type or "application/pdf"
        ext = os.path.splitext(file.filename or "doc.pdf")[1].lower()
        
        if ext not in VALID_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Please upload a PDF, JPG, JPEG, or PNG document.",
            )

        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 15MB limit. Please upload a smaller statement.",
            )

        safe_filename = _sanitize_filename(file.filename)
        key = f"bills/upload_{uuid.uuid4().hex[:12]}_{safe_filename}"
        s3_service.save_file_locally(key, file_bytes)
        s3_key = key

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Document content could not be located. Please provide file or valid S3 object key.",
        )

    try:
        extracted = await gemini_service.extract_bill_ocr(file_bytes, mime_type)
        validation = gemini_service.validate_fields(extracted)
    except (asyncio.TimeoutError, httpx.TimeoutException):
        raise HTTPException(
            status_code=504,
            detail="OCR processing timed out after 35 seconds. Please ensure the document is clear and try again.",
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail="Could not extract required billing parameters from document. Please verify the document is an Andhra Pradesh electricity bill.",
        )

    return OCRExtractResponse(
        success=True,
        data=extracted,
        validation=validation,
        document_s3_key=s3_key,
        source="gemini",
    )

