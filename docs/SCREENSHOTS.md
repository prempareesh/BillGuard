# BillGuard — Visual Showcase & Screenshot Capture Guide

This guide outlines the recommended screenshots to capture from a running local instance (`http://localhost:3000`) of **BillGuard**. Once captured, place the optimized images in the `assets/readme/screenshots/` directory to replace the README placeholders.

---

## Screenshot Specifications

- **Format:** PNG or WebP (compressed, high DPI)
- **Viewport Resolution:** 1280 × 800 px (16:10 aspect ratio) or 1920 × 1080 px (16:9)
- **Window Frame:** Clean browser frame or borderless with subtle box-shadow
- **Theme:** Clean default theme (Emerald/Dark Forest & Off-white accents)
- **Data Privacy:** Use synthetic or anonymized electricity bill data (e.g., sample service number `1122334455`, test consumer name `Sri K. Rao`). **Never capture real consumer personal data or actual utility account numbers.**

---

## Screen Capture Checklist

### 1. Consumer Dashboard & Analytics
- **Path:** `/dashboard`
- **Filename:** `assets/readme/screenshots/01-dashboard-overview.png`
- **Key Elements to Show:**
  - Metrics cards: Total Audits Verified, Identified Discrepancies, Total Savings Claimable.
  - Recent audit ledger cards showing status badges (`VERIFIED`, `DISCREPANCY_DETECTED`).
  - Monthly energy consumption trend chart.

### 2. Bill Upload & OCR Extraction Review
- **Path:** `/audit` or Audit Modal
- **Filename:** `assets/readme/screenshots/02-bill-upload-ocr.png`
- **Key Elements to Show:**
  - File drag-and-drop zone with APSPDCL/APEPDCL bill document uploaded.
  - Gemini multimodal extraction panel displaying structured fields: Service Number, Units Consumed (kWh), Billed Amount (₹), Billing Cycle.
  - Consumer verification toggle allowing manual correction before calculation.

### 3. Tariff Audit Engine & Slab Breakdown
- **Path:** `/audit` (Results View)
- **Filename:** `assets/readme/screenshots/03-tariff-audit-breakdown.png`
- **Key Elements to Show:**
  - Expected vs. Actual comparison card showing variance (e.g., Expected ₹1,424 vs. Billed ₹1,580).
  - Telescopic slab breakdown table displaying units calculated at each APERC bracket (0–30, 31–75, 76–125, etc.).
  - Electricity Duty (₹0.06/unit) and Customer Charges line items.
  - Discrepancy badge with variance explanation.

### 4. CGRF Dispute Letter Generator
- **Path:** Action Modal / Dispute Generator
- **Filename:** `assets/readme/screenshots/04-cgrf-dispute-draft.png`
- **Key Elements to Show:**
  - Formal letter drafted to the Consumer Grievance Redressal Forum (CGRF).
  - Pre-filled DISCOM details (APSPDCL / APEPDCL circle office), consumer service number, and APERC Retail Tariff Order citation.
  - One-click copy, PDF export, and trilingual explanation toggle (English / Telugu / Hindi).

### 5. Audit Ledger & Bill History
- **Path:** `/history`
- **Filename:** `assets/readme/screenshots/05-bill-history-ledger.png`
- **Key Elements to Show:**
  - Chronological table of persisted audits.
  - Storage indicator badge (AWS DynamoDB persistent mode vs. Local Fallback mode).
  - Search/filter bar and action buttons (view audit details, re-download CGRF letter, delete audit).

---

## How to Add Captured Screenshots to the README

1. Capture the five screens above from your browser while running `npm run dev` and `uvicorn backend.app.main:app`.
2. Create the folder:
   ```bash
   mkdir -p assets/readme/screenshots
   ```
3. Save the images matching the filenames listed above.
4. Update the corresponding image links in [README.md](file:///Users/preampareesh/Downloads/Bill_Gaurd/README.md).
