import os
import json
import time
import logging
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pathlib import Path
from fastapi import HTTPException
from .config import settings
from .schemas import StoredAuditRecord, StoredComplaintRecord

logger = logging.getLogger(__name__)

def _to_dynamo_safe(val: Any) -> Any:
    """Converts Python floats to Decimal for DynamoDB serialization."""
    if isinstance(val, float):
        return Decimal(str(round(val, 4)))
    if isinstance(val, dict):
        return {k: _to_dynamo_safe(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_to_dynamo_safe(v) for v in val]
    return val


STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
LOCAL_DB_FILE = STORAGE_DIR / "dynamodb_records.json"

class DynamoDBService:
    def __init__(self):
        self.table_name = settings.dynamodb_table_name
        self.region = settings.aws_region
        self.dynamodb = None
        self.table = None
        self._key_schema_attrs = None

        # Allow standard AWS credential provider chain (IAM Roles, App Runner, ECS, EC2)
        try:
            import boto3
            session = boto3.Session(region_name=self.region)
            self.dynamodb = session.resource("dynamodb", region_name=self.region)
            self.table = self.dynamodb.Table(self.table_name)
        except Exception as e:
            logger.warning(f"Boto3 DynamoDB could not be initialized: {e}")
            self.dynamodb = None
            self.table = None

        if not LOCAL_DB_FILE.exists():
            self._write_local_store({"audits": [], "complaints": [], "jobs": {}})

    def _get_key_schema(self) -> dict:
        """Returns {'hash': attr_name, 'range': attr_name_or_None}, defaulting to 'auditId'."""
        if self._key_schema_attrs is not None:
            return self._key_schema_attrs
        schema = {"hash": "auditId", "range": None}
        if self.table:
            try:
                self.table.load()
                for k in (self.table.key_schema or []):
                    if k.get("KeyType") == "HASH":
                        schema["hash"] = k.get("AttributeName", "auditId")
                    elif k.get("KeyType") == "RANGE":
                        schema["range"] = k.get("AttributeName")
                self._key_schema_attrs = schema
                return schema
            except Exception:
                pass
        self._key_schema_attrs = schema
        return schema

    def _make_key(self, partition_val: str, sort_val: Optional[str] = None, entity_prefix: str = "AUDIT") -> dict:
        """Constructs DynamoDB item Key matching the table's exact primary key schema."""
        schema = self._get_key_schema()
        hash_attr = schema.get("hash") or "auditId"
        range_attr = schema.get("range")

        key = {}
        if hash_attr == "PK":
            key["PK"] = f"{entity_prefix}#{partition_val}"
        elif hash_attr == "auditId":
            # Exact partition key for BillGuardAudits table
            if entity_prefix == "JOB" and not partition_val.startswith("JOB#"):
                key["auditId"] = f"JOB#{partition_val}"
            else:
                key["auditId"] = partition_val
        else:
            key[hash_attr] = partition_val

        if range_attr:
            key[range_attr] = sort_val if sort_val is not None else "METADATA"
        return key

    def _read_local_store(self) -> Dict[str, Any]:
        try:
            with open(LOCAL_DB_FILE, "r") as f:
                data = json.load(f)
                if "jobs" not in data:
                    data["jobs"] = {}
                return data
        except Exception:
            return {"audits": [], "complaints": [], "jobs": {}}

    def _write_local_store(self, data: Dict[str, Any]):
        try:
            with open(LOCAL_DB_FILE, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write to local DB mock: {e}")

    # --- OCR Job Multi-Instance Persistence ---
    def save_ocr_job(self, job_id: str, job_data: dict, ttl_seconds: int = 3600):
        """Persists OCR job across multiple instances using DynamoDB or local fallback."""
        expires_at = int(time.time()) + ttl_seconds
        item_to_store = {
            **job_data,
            "job_id": job_id,
            "expires_at": expires_at,
        }

        if self.table:
            try:
                dynamo_item = _to_dynamo_safe({
                    "auditId": f"JOB#{job_id}",
                    "id": job_id,
                    "job_id": job_id,
                    "PK": f"JOB#{job_id}",
                    "SK": "METADATA",
                    "EntityType": "OCRJob",
                    "expires_at": expires_at,
                    **item_to_store,
                })
                self.table.put_item(Item=dynamo_item)
                return
            except Exception as e:
                logger.warning(f"DynamoDB save_ocr_job failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to record OCR job state in Amazon DynamoDB in production.",
                    )

        if not settings.is_local_fallback_enabled:
            raise HTTPException(
                status_code=503,
                detail="Amazon DynamoDB is unavailable and local fallback is disabled in production.",
            )

        store = self._read_local_store()
        jobs = store.get("jobs", {})
        # Evict expired jobs from local mock
        now = time.time()
        active_jobs = {
            k: v for k, v in jobs.items() if v.get("expires_at", 0) > now
        }
        active_jobs[job_id] = item_to_store
        store["jobs"] = active_jobs
        self._write_local_store(store)

    def get_ocr_job(self, job_id: str) -> Optional[dict]:
        """Retrieves OCR job status across instances from DynamoDB or local fallback."""
        if self.table:
            try:
                key = self._make_key(job_id, "METADATA", entity_prefix="JOB")
                resp = self.table.get_item(Key=key)
                item = resp.get("Item")
                if item:
                    item.pop("PK", None)
                    item.pop("SK", None)
                    item.pop("EntityType", None)
                    return item
            except Exception as e:
                logger.warning(f"DynamoDB get_ocr_job failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to read OCR job from Amazon DynamoDB in production.",
                    )

        store = self._read_local_store()
        jobs = store.get("jobs", {})
        return jobs.get(job_id)

    # --- Audit Persistence ---
    def save_audit(self, record: StoredAuditRecord):
        """Saves audit record to DynamoDB (with explicit local dev fallback)."""
        item_dict = record.model_dump()

        if self.table:
            try:
                dynamo_item = _to_dynamo_safe({
                    "auditId": record.id,  # Explicit partition key for BillGuardAudits table
                    "id": record.id,
                    "PK": f"AUDIT#{record.id}",
                    "SK": "METADATA",
                    "EntityType": "Audit",
                    **item_dict,
                })
                self.table.put_item(Item=dynamo_item)
                # Keep local store in sync
                store = self._read_local_store()
                audits = [a for a in store.get("audits", []) if a.get("id") != record.id]
                audits.insert(0, item_dict)
                store["audits"] = audits
                self._write_local_store(store)
                return
            except Exception as e:
                logger.warning(f"DynamoDB put_item failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to persist audit to Amazon DynamoDB in production environment.",
                    )

        if not settings.is_local_fallback_enabled:
            raise HTTPException(
                status_code=503,
                detail="Amazon DynamoDB is unreachable and local fallback is disabled in production.",
            )

        store = self._read_local_store()
        audits = [a for a in store.get("audits", []) if a.get("id") != record.id]
        audits.insert(0, item_dict)
        store["audits"] = audits
        self._write_local_store(store)

    def get_audits(self, limit: int = 50) -> List[StoredAuditRecord]:
        """Fetches audit records from DynamoDB (with local dev fallback)."""
        if self.table:
            try:
                response = self.table.scan(Limit=limit)
                items = response.get("Items", [])
                audit_items = []
                for item in items:
                    if item.get("EntityType") == "Audit" or "units_consumed" in item:
                        # Normalize auditId to id for StoredAuditRecord compatibility
                        if "auditId" in item and "id" not in item:
                            item["id"] = item["auditId"]
                        audit_items.append(StoredAuditRecord(**item))
                # Authoritative response from DynamoDB (even if 0 records exist)
                return audit_items
            except Exception as e:
                logger.warning(f"DynamoDB scan failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to read audits from Amazon DynamoDB in production environment.",
                    )

        store = self._read_local_store()
        audits = store.get("audits", [])
        return [StoredAuditRecord(**a) for a in audits[:limit]]

    def delete_audit(self, audit_id: str):
        """Deletes audit record and cleans up associated document safely."""
        from .s3_service import s3_service

        doc_key_to_delete = None

        if self.table:
            try:
                # Retrieve item first to locate associated S3 key for cleanup
                key = self._make_key(audit_id, "METADATA", entity_prefix="AUDIT")
                resp = self.table.get_item(Key=key)
                item = resp.get("Item")
                if item:
                    doc_key_to_delete = item.get("s3_document_key")

                self.table.delete_item(Key=key)
            except Exception as e:
                logger.warning(f"DynamoDB delete_item failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to delete audit in Amazon DynamoDB in production environment.",
                    )

        # Always purge from local fallback store to ensure consistent state across all stores
        store = self._read_local_store()
        audits = store.get("audits", [])
        for a in audits:
            if a.get("id") == audit_id:
                if not doc_key_to_delete:
                    doc_key_to_delete = a.get("s3_document_key")
                break

        store["audits"] = [a for a in audits if a.get("id") != audit_id]
        self._write_local_store(store)

        if doc_key_to_delete:
            try:
                s3_service.delete_file(doc_key_to_delete)
            except Exception as e:
                logger.warning(f"Failed deleting associated S3 file: {e}")

    # --- Complaints Persistence ---
    def save_complaint(self, complaint: StoredComplaintRecord):
        """Saves grievance complaint to DynamoDB (with local dev fallback)."""
        item_dict = complaint.model_dump()
        if self.table:
            try:
                dynamo_item = _to_dynamo_safe({
                    "auditId": complaint.audit_id or complaint.id,  # Partition key compatibility
                    "complaintId": complaint.id,
                    "id": complaint.id,
                    "PK": f"COMPLAINT#{complaint.id}",
                    "SK": f"AUDIT#{complaint.audit_id}",
                    "EntityType": "Complaint",
                    **item_dict,
                })
                self.table.put_item(Item=dynamo_item)
                return
            except Exception as e:
                logger.warning(f"DynamoDB complaint put_item failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to save complaint to Amazon DynamoDB in production.",
                    )

        if not settings.is_local_fallback_enabled:
            raise HTTPException(
                status_code=503,
                detail="Amazon DynamoDB is unreachable and local fallback is disabled in production.",
            )

        store = self._read_local_store()
        complaints = [c for c in store.get("complaints", []) if c.get("id") != complaint.id]
        complaints.insert(0, item_dict)
        store["complaints"] = complaints
        self._write_local_store(store)

    def get_complaints(self, limit: int = 50) -> List[StoredComplaintRecord]:
        """Fetches complaint records from DynamoDB (with local dev fallback)."""
        if self.table:
            try:
                response = self.table.scan(Limit=limit)
                items = response.get("Items", [])
                complaint_items = []
                for item in items:
                    if item.get("EntityType") == "Complaint" or "complaint_letter_text" in item:
                        if "complaintId" in item and "id" not in item:
                            item["id"] = item["complaintId"]
                        complaint_items.append(StoredComplaintRecord(**item))
                if complaint_items:
                    return complaint_items
            except Exception as e:
                logger.warning(f"DynamoDB complaint scan failed: {type(e).__name__}")
                if not settings.is_local_fallback_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to read complaints from Amazon DynamoDB in production.",
                    )

        store = self._read_local_store()
        return [StoredComplaintRecord(**c) for c in store.get("complaints", [])[:limit]]

    def check_connection(self) -> dict:
        """
        Validates connection to the target DynamoDB table in ap-southeast-2.
        Returns a diagnostic dictionary without exposing credentials.
        """
        if not self.table:
            return {
                "table": self.table_name,
                "region": self.region,
                "connected": False,
                "status": "table_not_initialized",
                "message": "AWS DynamoDB table resource could not be initialized.",
            }

        try:
            self.table.load()
            key_schema = [
                {"attribute": k.get("AttributeName"), "type": k.get("KeyType")}
                for k in (self.table.key_schema or [])
            ]
            return {
                "table": self.table_name,
                "region": self.region,
                "connected": True,
                "status": "connected",
                "table_status": self.table.table_status,
                "key_schema": key_schema,
                "item_count": self.table.item_count,
                "message": f"Successfully connected to DynamoDB table '{self.table_name}'.",
            }
        except Exception as e:
            err_code = getattr(e, "response", {}).get("Error", {}).get("Code", type(e).__name__)
            return {
                "table": self.table_name,
                "region": self.region,
                "connected": False,
                "status": "connection_failed",
                "error_code": err_code,
                "message": f"Cannot reach DynamoDB table '{self.table_name}': {err_code}",
            }

dynamo_service = DynamoDBService()

