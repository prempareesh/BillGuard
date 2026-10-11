# BillGuard Engineering Architecture

This document provides in-depth technical documentation for developers, cloud architects, and security reviewers.

---

## 1. System Topology

```
[Browser / Mobile] 
        │
        ▼ HTTPS
[Next.js 15 Client (React 19)]
        │
        ▼ REST JSON (CORS + Rate Limiting)
[FastAPI Backend (Python 3.10+)]
   ├── APERC Deterministic Tariff Engine (Python)
   ├── Google Gemini Multimodal Vision Service
   ├── Amazon S3 Document Service (Bucket: billguard-documents-pream-2026)
   ├── Amazon DynamoDB Service (Table: BillGuardAudits, PK: auditId)
   └── Local Resilient Storage Fallback (JSON file & local disk uploads)
```

---

## 2. Persistence Model & DynamoDB Schema

BillGuard uses a single-table design for consumer audit statements and grievance complaints:

- **Table Name:** `BillGuardAudits`
- **Region:** `ap-southeast-2` (configurable via `AWS_REGION`)
- **Partition Key:** `auditId` (String, UUID)
- **Attribute Fields:**
  - `consumerServiceNo` (String)
  - `discom` (String: `APSPDCL` | `APEPDCL` | `APCPDCL`)
  - `category` (String: `LT-I Domestic` | `LT-II Commercial`)
  - `units` (Number)
  - `billedAmount` (Number)
  - `expectedAmount` (Number)
  - `variance` (Number)
  - `status` (String: `Verified` | `Potential Overcharge` | `Review Recommended`)
  - `documentUrl` (String, S3 URI or local fallback reference)
  - `complaintDraft` (String, optional formal grievance text)
  - `createdAt` (String, ISO-8601 timestamp)

### Resilient Local Fallback

If AWS credentials are not configured in the host environment, `dynamo_service.py` automatically routes read/write operations to `backend/storage/dynamodb_records.json`. This enables complete offline feature parity without code modification or mock servers.

---

## 3. Rate Limiting & Security Boundary

- **Sliding Window Middleware:** FastAPI enforces an in-memory sliding-window rate limiter restricting clients to 60 requests per minute per IP address on mutating `/api/*` routes.
- **Server-Side API Key Shield:** The Google Gemini API key (`GEMINI_API_KEY`) and AWS credentials (`boto3` environment or IAM role) are strictly isolated to the backend process. No credentials or secret keys are bundled into client-side JavaScript.
- **CORS Protection:** Configurable whitelist restricting browser access to trusted frontend origins (`http://localhost:3000` in development).
