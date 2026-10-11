# BillGuard AWS Deployment & Hosting Guide

## Overview
BillGuard is architected as an enterprise-grade cloud native application split into:
1. **Frontend**: Next.js 15+ App Router hosted on **AWS Amplify Hosting**.
2. **Backend**: FastAPI (Python 3.9+) containerized service hosted on **AWS App Runner** or **Amazon ECS (Fargate)**.
3. **Database**: **Amazon DynamoDB** (Table `BillGuardAudits` in region `ap-southeast-2`).
4. **Storage**: **Amazon S3** (Private document bucket `billguard-documents-pream-2026` in region `ap-southeast-2`).
5. **AI/OCR**: **Google Gemini Generative Language API** (Invoked server-side with protected keys).

---

## 1. Backend Hosting: AWS App Runner (Recommended)

### Why AWS App Runner?
- Fully managed container hosting with automatic HTTPS TLS certificate termination.
- Zero server/infrastructure management; auto-scales based on incoming requests.
- Direct integration with AWS IAM Instance Roles for secure S3 and DynamoDB access without hardcoded access keys.

### Containerization (`Dockerfile`)
```dockerfile
FROM python:3.9-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### AWS App Runner Configuration
- **Source**: Amazon ECR Image repository.
- **Port**: 8000.
- **Environment Variables**:
  - `AWS_REGION`: `ap-southeast-2`
  - `S3_BUCKET_NAME`: `billguard-documents-pream-2026`
  - `DYNAMODB_TABLE_NAME`: `BillGuardAudits`
  - `GEMINI_API_KEY`: AWS Secrets Manager or App Runner Environment Secret.
- **Instance Role Policy (Least-Privilege)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BillDocumentsAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadBucket"
      ],
      "Resource": [
        "arn:aws:s3:::billguard-documents-pream-2026",
        "arn:aws:s3:::billguard-documents-pream-2026/*"
      ]
    },
    {
      "Sid": "DynamoDBAuditsAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:ap-southeast-2:*:table/BillGuardAudits"
    }
  ]
}
```

---

## 2. Safe Local Development Credential Setup

During local development, NEVER commit AWS credentials to Git. Use one of the standard AWS SDK credential provider chains:

### Option A: AWS CLI Profile (Recommended)
1. Install AWS CLI:
   ```bash
   brew install awscli
   ```
2. Configure credentials into your user profile `~/.aws/credentials`:
   ```bash
   aws configure
   # AWS Access Key ID: <YOUR_ACCESS_KEY>
   # AWS Secret Access Key: <YOUR_SECRET_KEY>
   # Default region name: ap-southeast-2
   # Default output format: json
   ```
3. Boto3 automatically picks up these credentials when starting the FastAPI backend.

### Option B: Temporary Shell Environment Variables
Export credentials in your active terminal session only (not saved in any file):
```bash
export AWS_REGION="ap-southeast-2"
export AWS_ACCESS_KEY_ID="<YOUR_ACCESS_KEY>"
export AWS_SECRET_ACCESS_KEY="<YOUR_SECRET_KEY>"
```

### Option C: Local Fallback Mode
If credentials are not configured, BillGuard automatically runs in local fallback mode:
- Uploads are saved to `backend/storage/uploads/`
- Records are saved to `backend/storage/dynamodb_records.json`
- No crash or exception occurs.

---

## 3. Amazon DynamoDB Table Setup

- **Table Name**: `BillGuardAudits`
- **Region**: `ap-southeast-2` (Sydney)
- **Primary Partition Key (PK)**: `PK` (String) or `id` (String).
  - *Note: BillGuard's backend dynamically adapts to either composite `PK`/`SK` or single `id` partition key schemas.*
- **Sort Key (Optional)**: `SK` (String)
- **Capacity Mode**: On-Demand (pay-per-request serverless).

---

## 4. Amazon S3 Bucket Setup

- **Bucket Name**: `billguard-documents-pream-2026`
- **Region**: `ap-southeast-2` (Sydney)
- **Block Public Access**: **ENABLED** (All 4 settings checked).
- **Default Encryption**: SSE-S3 (Amazon S3-managed keys) or SSE-KMS.
- **CORS Configuration**:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": [
      "https://*.amplifyapp.com",
      "https://billguard.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 5. Verification Endpoint

Verify AWS connectivity without exposing secrets by calling:
```bash
curl http://127.0.0.1:8001/api/aws/status
```
Response:
```json
{
  "configured_region": "ap-southeast-2",
  "overall_aws_connected": true,
  "local_fallback_active": true,
  "s3": {
    "bucket": "billguard-documents-pream-2026",
    "region": "ap-southeast-2",
    "connected": true,
    "status": "connected"
  },
  "dynamodb": {
    "table": "BillGuardAudits",
    "region": "ap-southeast-2",
    "connected": true,
    "status": "connected"
  }
}
```
