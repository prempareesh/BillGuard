# BillGuard

AI-Powered Electricity Bill Audit, Tariff Verification & Consumer Advocacy Engine for Andhra Pradesh (APERC).

## Features
- **Deterministic APERC Tariff Engine**: Verifies retail consumer electricity statements against statutory APERC retail tariff orders.
- **Multilingual Support**: Real-time localization in English, Telugu (తెలుగు), and Hindi (हिंदी).
- **Consumer Grievance Center**: Automated generation of statutory dispute letters for CGRF / Ombudsman escalation.
- **Document OCR & S3 Upload**: Fast extraction with fallback to deterministic local processing.
- **AWS DynamoDB Persistence**: Single-table persistence for audited statement records and grievance complaints with fallback resilience.

## Getting Started

### 1. Frontend (Next.js)
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
```

### 3. Tests
- Frontend tests: `npm test`
- Backend API tests: `PYTHONPATH=. backend/.venv/bin/python -m unittest backend/tests/test_api_endpoints.py`
- Backend Tariff tests: `PYTHONPATH=. backend/.venv/bin/python -m unittest backend/tests/test_tariff_engine.py`
