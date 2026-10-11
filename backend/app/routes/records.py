from fastapi import APIRouter
from typing import List
from ..schemas import StoredAuditRecord, StoredComplaintRecord
from ..dynamo_service import dynamo_service

router = APIRouter(prefix="/api/records", tags=["records"])

@router.get("/audits", response_model=List[StoredAuditRecord])
async def list_audits():
    """Retrieves saved audit history from Amazon DynamoDB."""
    return dynamo_service.get_audits()

@router.post("/audits")
async def save_audit(record: StoredAuditRecord):
    """Persists audited statement into Amazon DynamoDB single-table store."""
    dynamo_service.save_audit(record)
    return {"success": True, "id": record.id}

@router.delete("/audits/{audit_id}")
async def delete_audit(audit_id: str):
    """Deletes audit record from Amazon DynamoDB."""
    dynamo_service.delete_audit(audit_id)
    return {"success": True, "deleted": audit_id}

@router.post("/complaints")
async def save_complaint(complaint: StoredComplaintRecord):
    """Persists CGRF dispute complaint in Amazon DynamoDB."""
    dynamo_service.save_complaint(complaint)
    return {"success": True, "id": complaint.id}

@router.get("/complaints", response_model=List[StoredComplaintRecord])
async def list_complaints():
    """Retrieves CGRF complaints from Amazon DynamoDB."""
    return dynamo_service.get_complaints()
