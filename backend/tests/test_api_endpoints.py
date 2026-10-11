import unittest
import io
import time
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas import ExtractedBillData

class TestFastAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    # 1. Health & System Architecture
    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("architecture", data)
        self.assertEqual(data["architecture"]["database"], "Amazon DynamoDB")

    # 2. DISCOMs Reference Endpoint
    def test_discoms_list(self):
        response = self.client.get("/api/tariff/discoms")
        self.assertEqual(response.status_code, 200)
        discoms = response.json()
        self.assertGreaterEqual(len(discoms), 3)
        discom_ids = [d["id"] for d in discoms]
        self.assertIn("APSPDCL", discom_ids)
        self.assertIn("APEPDCL", discom_ids)
        self.assertIn("APCPDCL", discom_ids)

    # 3. Deterministic APERC Tariff Audit Endpoint
    def test_tariff_audit_calculation(self):
        payload = {
            "discom": "APSPDCL",
            "consumer_category": "Domestic",
            "units_consumed": 220,
            "actual_bill_amount": 1600.0,
            "billing_month": "August 2026",
            "is_demo": False,
        }
        response = self.client.post("/api/tariff/audit", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["discom"], "APSPDCL")
        self.assertEqual(data["units_consumed"], 220)
        self.assertIn("audit_certificate_id", data)
        self.assertEqual(data["tariff_schedule_version"], "APERC-TO-2026-27")
        self.assertGreater(data["expected_bill"], 0)
        self.assertEqual(len(data["slabs"]), 4)

    # 4. Upload Presign Validation
    def test_upload_presign_valid(self):
        payload = {
            "filename": "electricity_bill.pdf",
            "content_type": "application/pdf",
            "file_size_bytes": 1024 * 500,  # 500 KB
        }
        response = self.client.post("/api/upload/presign", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("upload_url", data)
        self.assertIn("object_key", data)
        self.assertTrue(data["object_key"].startswith("bills/"))

    def test_upload_presign_rejects_empty_file(self):
        payload = {
            "filename": "empty_bill.pdf",
            "content_type": "application/pdf",
            "file_size_bytes": 0,  # 0 bytes
        }
        response = self.client.post("/api/upload/presign", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["detail"].lower())

    def test_upload_presign_rejects_invalid_extension(self):
        payload = {
            "filename": "malicious_script.exe",
            "content_type": "application/octet-stream",
            "file_size_bytes": 5000,
        }
        response = self.client.post("/api/upload/presign", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported document format", response.json()["detail"])

    def test_upload_presign_rejects_oversized_file(self):
        payload = {
            "filename": "huge_statement.pdf",
            "content_type": "application/pdf",
            "file_size_bytes": 20 * 1024 * 1024,  # 20 MB > 15MB limit
        }
        response = self.client.post("/api/upload/presign", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("exceeds maximum permitted limit", response.json()["detail"])

    # 5. Direct Upload Security & Path Traversal
    def test_direct_upload_rejects_path_traversal(self):
        file_content = b"%PDF-1.4 test content"
        files = {"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
        response = self.client.post("/api/upload/direct?key=../etc/passwd", files=files)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid storage key path", response.json()["detail"])

    def test_direct_upload_valid_file(self):
        file_content = b"%PDF-1.4 valid test pdf document"
        files = {"file": ("sample.pdf", io.BytesIO(file_content), "application/pdf")}
        response = self.client.post("/api/upload/direct?key=bills/upload_test_sample.pdf", files=files)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["object_key"], "bills/upload_test_sample.pdf")

    # 6. OCR Extraction (Demo mode)
    def test_ocr_extract_demo_mode(self):
        response = self.client.post("/api/ocr/extract", data={"is_demo": "true"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["source"], "demo")
        self.assertEqual(data["data"]["discom"], "APSPDCL")
        self.assertEqual(data["data"]["units_consumed"], 320)
        self.assertEqual(data["validation"]["overall_status"], "Validated")

    # 7. OCR Job Lifecycle & Background Processing
    @patch("backend.app.gemini_service.gemini_service.extract_bill_ocr")
    def test_ocr_start_job_and_poll(self, mock_ocr):
        mock_ocr.return_value = ExtractedBillData(
            consumer_name="T. Murali Krishna",
            consumer_number="1982736451",
            service_number="VIZ-01-44912",
            discom="APEPDCL",
            consumer_category="Domestic",
            billing_month="September 2026",
            units_consumed=180,
            bill_amount=1056,
            fixed_charges=30,
            taxes=11,
            fuel_adjustment_charges=27,
            previous_reading=4120,
            current_reading=4300,
            due_date="20-09-2026",
            is_demo=False,
        )

        file_bytes = b"%PDF-1.4 test statement content"
        files = {"file": ("bill.pdf", io.BytesIO(file_bytes), "application/pdf")}
        response = self.client.post("/api/ocr/start-job", files=files)
        self.assertEqual(response.status_code, 200)
        job_info = response.json()
        job_id = job_info["job_id"]
        self.assertTrue(job_id.startswith("job-"))

        # Poll status
        status_resp = self.client.get(f"/api/ocr/job/{job_id}")
        self.assertEqual(status_resp.status_code, 200)
        status_data = status_resp.json()
        self.assertIn(status_data["status"], ["processing", "completed"])

    # 8. Audit Record CRUD in DynamoDB
    def test_audit_record_lifecycle(self):
        test_id = f"TEST-AUD-{int(time.time())}"
        audit_payload = {
            "id": test_id,
            "timestamp": "11 Oct 2026, 07:00 AM",
            "consumer_name": "Test Consumer",
            "service_number": "SEC-01-99999",
            "consumer_number": "9999988888",
            "discom": "APCPDCL",
            "billing_month": "August 2026",
            "units_consumed": 150,
            "expected_amount": 670.0,
            "actual_amount": 720.0,
            "difference": 50.0,
            "status": "Review Recommended",
            "s3_document_key": "bills/upload_test.pdf",
        }

        # 1. Save
        save_resp = self.client.post("/api/records/audits", json=audit_payload)
        self.assertEqual(save_resp.status_code, 200)
        self.assertTrue(save_resp.json()["success"])

        # 2. List
        list_resp = self.client.get("/api/records/audits")
        self.assertEqual(list_resp.status_code, 200)
        saved_items = list_resp.json()
        matching = [item for item in saved_items if item["id"] == test_id]
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]["consumer_name"], "Test Consumer")

        # 3. Delete
        del_resp = self.client.delete(f"/api/records/audits/{test_id}")
        self.assertEqual(del_resp.status_code, 200)
        self.assertTrue(del_resp.json()["success"])

        # 4. Verify Deleted
        after_list = self.client.get("/api/records/audits").json()
        still_existing = [item for item in after_list if item["id"] == test_id]
        self.assertEqual(len(still_existing), 0)

    # 9. AWS Configuration & Status Diagnostics
    def test_aws_status_endpoint(self):
        response = self.client.get("/api/aws/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["configured_region"], "ap-southeast-2")
        self.assertIn("s3", data)
        self.assertIn("dynamodb", data)
        self.assertEqual(data["s3"]["bucket"], "billguard-documents-pream-2026")
        self.assertEqual(data["s3"]["region"], "ap-southeast-2")
        self.assertEqual(data["dynamodb"]["table"], "BillGuardAudits")
        self.assertEqual(data["dynamodb"]["region"], "ap-southeast-2")
        self.assertIn("local_fallback_active", data)

    def test_health_check_includes_aws_config(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["aws_region"], "ap-southeast-2")
        self.assertEqual(data["s3_bucket"], "billguard-documents-pream-2026")
        self.assertEqual(data["dynamodb_table"], "BillGuardAudits")

    # 10. Complaint Record CRUD
    def test_complaint_record_lifecycle(self):
        test_comp_id = f"TEST-COMP-{int(time.time())}"
        test_audit_id = f"TEST-AUD-{int(time.time())}"
        complaint_payload = {
            "id": test_comp_id,
            "audit_id": test_audit_id,
            "consumer_number": "SEC-01-88888",
            "discom": "APSPDCL",
            "actual_bill": 1500.0,
            "expected_bill": 1200.0,
            "difference": 300.0,
            "status": "Submitted",
            "created_at": "11 Oct 2026, 08:00 AM",
            "complaint_letter_text": "Excess variance dispute letter content for CGRF submission.",
        }

        # 1. Save
        save_resp = self.client.post("/api/records/complaints", json=complaint_payload)
        self.assertEqual(save_resp.status_code, 200)
        self.assertTrue(save_resp.json()["success"])

        # 2. List
        list_resp = self.client.get("/api/records/complaints")
        self.assertEqual(list_resp.status_code, 200)
        items = list_resp.json()
        matching = [item for item in items if item["id"] == test_comp_id]
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]["audit_id"], test_audit_id)

    # 11. Schema Compatibility with auditId Partition Key
    def test_dynamodb_audit_id_partition_key(self):
        from backend.app.dynamo_service import dynamo_service
        key = dynamo_service._make_key("sample-audit-999")
        self.assertIn("auditId", key)
        self.assertEqual(key["auditId"], "sample-audit-999")

    # 12. Regression Test: Deleted Audits Never Reappear On Refresh or Local Fallback
    def test_delete_audit_and_empty_state_regression(self):
        from backend.app.dynamo_service import dynamo_service
        test_id = f"REGRESS-AUD-{int(time.time())}"
        payload = {
            "id": test_id,
            "timestamp": "11 Oct 2026, 05:00 PM",
            "consumer_name": "Ghost Consumer",
            "service_number": "SEC-GHOST-1",
            "consumer_number": "GHOST-1234",
            "discom": "APSPDCL",
            "billing_month": "October 2026",
            "units_consumed": 125,
            "expected_amount": 535.77,
            "actual_amount": 536.0,
            "difference": 0.23,
            "status": "Verified",
        }

        # 1. Save
        save_resp = self.client.post("/api/records/audits", json=payload)
        self.assertEqual(save_resp.status_code, 200)

        # 2. Verify it is present
        list_resp = self.client.get("/api/records/audits")
        self.assertEqual(list_resp.status_code, 200)
        found = [x for x in list_resp.json() if x["id"] == test_id]
        self.assertEqual(len(found), 1)

        # 3. Delete via API
        del_resp = self.client.delete(f"/api/records/audits/{test_id}")
        self.assertEqual(del_resp.status_code, 200)

        # 4. Verify absent from backend endpoint
        list_after = self.client.get("/api/records/audits").json()
        self.assertEqual([x for x in list_after if x["id"] == test_id], [])

        # 5. Verify absent from local store file as well
        local_data = dynamo_service._read_local_store()
        local_audits = [a for a in local_data.get("audits", []) if a.get("id") == test_id]
        self.assertEqual(local_audits, [], "Deleted audit must be purged from local storage too")

if __name__ == "__main__":
    unittest.main()
