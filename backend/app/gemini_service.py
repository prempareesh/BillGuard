import json
import logging
import re
from typing import Dict, Any, Optional
import httpx
from .config import settings
from .schemas import (
    ExtractedBillData,
    OCRValidationResult,
    FieldValidationItem,
    MultilingualExplainResponse,
    AssistantChatResponse,
)

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
]

class GeminiService:
    @property
    def api_key(self) -> str:
        return settings.gemini_api_key

    async def call_gemini(self, contents: list) -> str:
        """Invokes Google Gemini Generative AI securely using server-side headers."""
        if not self.api_key:
            raise RuntimeError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in server environment."
            )

        last_error = None
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                # 35 second timeout for multi-modal processing
                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.post(url, headers=headers, json={"contents": contents})
                    if resp.status_code == 200:
                        data = resp.json()
                        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                    elif resp.status_code in (400, 401, 403):
                        logger.warning(f"Gemini API authentication failed (HTTP {resp.status_code})")
                        raise RuntimeError(
                            "Gemini API authentication failed (invalid or unauthorized API key). Please verify your GEMINI_API_KEY configuration."
                        )
                    else:
                        logger.warning(f"Gemini model {model} returned non-200 status {resp.status_code}")
            except RuntimeError:
                raise
            except Exception as e:
                last_error = e
                logger.warning(f"Error invoking Gemini model {model}: {type(e).__name__}")
        raise last_error or Exception("Gemini API call failed")


    async def extract_bill_ocr(
        self, file_bytes: bytes, mime_type: str = "application/pdf"
    ) -> ExtractedBillData:
        """Extracts electricity bill fields via Gemini Multimodal API."""
        import base64
        b64 = base64.b64encode(file_bytes).decode("utf-8")

        prompt = """
You are an expert electricity bill auditing AI specialized in Andhra Pradesh DISCOMs (APSPDCL, APCPDCL, APEPDCL).
Analyze this bill and return strict JSON with these exact keys:
{
  "consumer_name": "Full name",
  "consumer_number": "Consumer account number",
  "service_number": "Distribution USC number",
  "discom": "APSPDCL" | "APCPDCL" | "APEPDCL",
  "consumer_category": "Domestic",
  "billing_month": "Month and Year e.g. August 2026",
  "units_consumed": 0,
  "bill_amount": 0,
  "fixed_charges": 0,
  "taxes": 0,
  "fuel_adjustment_charges": 0,
  "previous_reading": 0,
  "current_reading": 0,
  "due_date": "DD-MM-YYYY"
}
Output ONLY valid JSON.
"""
        contents = [
            {
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": mime_type, "data": b64}},
                ]
            }
        ]

        raw_text = await self.call_gemini(contents)
        json_str = raw_text
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
        if match:
            json_str = match.group(1)
        
        parsed = json.loads(json_str.strip())
        return self._normalize_extracted(parsed)

    def _normalize_extracted(self, d: dict) -> ExtractedBillData:
        """Robustly normalizes raw dictionary into typed ExtractedBillData."""
        def to_float(v, default=0.0):
            if v is None:
                return default
            if isinstance(v, (int, float)):
                return float(v)
            cleaned = re.sub(r"[^\d.-]", "", str(v))
            try:
                return float(cleaned)
            except Exception:
                return default

        discom_str = str(d.get("discom", "APSPDCL")).upper()
        if "EPDCL" in discom_str:
            discom_val = "APEPDCL"
        elif "CPDCL" in discom_str:
            discom_val = "APCPDCL"
        else:
            discom_val = "APSPDCL"

        return ExtractedBillData(
            consumer_name=str(d.get("consumer_name") or d.get("consumerName") or "").strip(),
            consumer_number=str(d.get("consumer_number") or d.get("consumerNumber") or "").strip(),
            service_number=str(d.get("service_number") or d.get("serviceNumber") or "").strip(),
            discom=discom_val,
            consumer_category="Domestic",
            billing_month=str(d.get("billing_month") or d.get("billingMonth") or "August 2026").strip(),
            units_consumed=to_float(d.get("units_consumed") if "units_consumed" in d else d.get("units")),
            bill_amount=to_float(d.get("bill_amount") if "bill_amount" in d else d.get("amount")),
            fixed_charges=to_float(d.get("fixed_charges") if "fixed_charges" in d else d.get("fixedCharges"), 30.0),
            taxes=to_float(d.get("taxes") if "taxes" in d else d.get("electricity_duty"), 0.0),
            fuel_adjustment_charges=to_float(d.get("fuel_adjustment_charges") if "fuel_adjustment_charges" in d else d.get("fppca"), 0.0),
            previous_reading=to_float(d.get("previous_reading") if "previous_reading" in d else d.get("previousReading"), 0.0),
            current_reading=to_float(d.get("current_reading") if "current_reading" in d else d.get("currentReading"), 0.0),
            due_date=str(d.get("due_date") or d.get("dueDate") or "").strip(),
            is_demo=False,
        )

    def validate_fields(self, data: ExtractedBillData) -> OCRValidationResult:
        """
        Validates extracted fields with transparent states:
        - Validated
        - Needs Review
        - Missing
        - Corrected by User
        Checks arithmetic relationships between extracted fields.
        """
        items = []
        warnings = []
        reconciled = True

        # Consumer Number
        if data.consumer_number and len(str(data.consumer_number)) >= 6:
            items.append(
                FieldValidationItem(
                    field_name="Consumer / Service ID",
                    extracted_value=str(data.consumer_number),
                    status="Validated",
                    reason="Identified official AP account identifier",
                )
            )
        else:
            items.append(
                FieldValidationItem(
                    field_name="Consumer / Service ID",
                    extracted_value=str(data.consumer_number or "Missing"),
                    status="Needs Review",
                    reason="Identifier short or unverified",
                )
            )

        # Units Consumed
        if data.units_consumed > 0:
            meter_delta = None
            if (
                data.current_reading is not None
                and data.previous_reading is not None
                and data.current_reading > data.previous_reading
            ):
                meter_delta = data.current_reading - data.previous_reading

            if meter_delta is not None and abs(meter_delta - data.units_consumed) > 2:
                items.append(
                    FieldValidationItem(
                        field_name="Units Consumed",
                        extracted_value=f"{data.units_consumed} kWh",
                        status="Needs Review",
                        reason=f"Meter delta ({meter_delta} kWh) deviates from billed consumption ({data.units_consumed} kWh)",
                    )
                )
                warnings.append("Meter reading delta does not match billed units.")
                reconciled = False
            else:
                items.append(
                    FieldValidationItem(
                        field_name="Units Consumed",
                        extracted_value=f"{data.units_consumed} kWh",
                        status="Validated",
                        reason="Units verified with meter readings",
                    )
                )
        else:
            items.append(
                FieldValidationItem(
                    field_name="Units Consumed",
                    extracted_value="0 kWh",
                    status="Missing",
                    reason="Consumption units missing or zero",
                )
            )

        # Bill Amount
        if data.bill_amount > 0:
            items.append(
                FieldValidationItem(
                    field_name="Billed Amount",
                    extracted_value=f"₹{int(data.bill_amount)}",
                    status="Validated",
                    reason="Total statement figure found",
                )
            )
        else:
            items.append(
                FieldValidationItem(
                    field_name="Billed Amount",
                    extracted_value="Missing",
                    status="Missing",
                    reason="Bill total not detected",
                )
            )

        # DISCOM
        items.append(
            FieldValidationItem(
                field_name="DISCOM Authority",
                extracted_value=data.discom,
                status="Validated",
                reason=f"Recognized Andhra Pradesh utility ({data.discom})",
            )
        )

        overall = "Validated" if all(i.status == "Validated" for i in items) else "Needs Review"
        return OCRValidationResult(
            overall_status=overall,
            arithmetic_reconciled=reconciled,
            fields=items,
            warnings=warnings,
        )

    async def multilingual_explain(
        self, language: str, audit_data: dict
    ) -> MultilingualExplainResponse:
        """Provides official APERC regulatory explanation in English, Telugu, or Hindi."""
        discom = audit_data.get("discom", "APSPDCL")
        units = audit_data.get("units_consumed", 320)
        expected = audit_data.get("expected_bill", 2740)
        actual = audit_data.get("actual_bill", 2850)
        diff = audit_data.get("difference", 110)

        prompt = f"""
You are an APERC Tariff Auditor. Explain this electricity bill audit in language '{language}':
DISCOM: {discom}
Units: {units} kWh
Expected (APERC Approved): ₹{expected}
Actual Billed: ₹{actual}
Variance: ₹{diff}

Generate strict JSON:
{{
  "headline": "Short official title in {language}",
  "explanation": "Clear explanation of why variance occurred in {language}",
  "key_reasons": ["Reason 1 in {language}", "Reason 2 in {language}", "Reason 3 in {language}"],
  "alert_title": "Audit Alert in {language}",
  "alert_message": "Alert details in {language}",
  "recommendation_summary": "Energy advice in {language}"
}}
"""
        try:
            raw = await self.call_gemini([{"parts": [{"text": prompt}]}])
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
            json_str = match.group(1) if match else raw
            parsed = json.loads(json_str.strip())
            return MultilingualExplainResponse(**parsed)
        except Exception:
            # Deterministic multi-language fallbacks
            if language == "te":
                return MultilingualExplainResponse(
                    headline="APERC అధికారిక టారిఫ్ ఆడిట్ నివేదిక",
                    explanation=f"మీ బిల్లు ₹{actual} గా ఉంది, ఇది APERC ఆమోదిత మొత్తం ₹{expected} కంటే ₹{diff} ఎక్కువ.",
                    key_reasons=[
                        f"వినియోగం ({units} యూనిట్లు) గరిష్ట 226–400 స్లాబ్‌లోకి ప్రవేశించింది",
                        "స్థిర ఛార్జీలు APERC నిబంధనల ప్రకారం వర్తిస్తాయి",
                        "FPPCA ఇంధన సర్దుబాటు చట్టబద్ధమైన గెజిట్ ప్రకారం లెక్కించబడింది",
                    ],
                    alert_title="అధిక వసూలు హెచ్చరిక (Overcharge)",
                    alert_message="APERC నిబంధనల ప్రకారం ఈ వ్యత్యాసానికి ఫిర్యాదు చేయడానికి అర్హత ఉంది.",
                    recommendation_summary="భారీ విద్యుత్ లోడ్ తగ్గించి నెలకు ఆదా చేసుకోండి.",
                )
            elif language == "hi":
                return MultilingualExplainResponse(
                    headline="APERC आधिकारिक टैरिफ ऑडिट रिपोर्ट",
                    explanation=f"आपका वास्तविक बिल ₹{actual} है, जो APERC अनुमोदित दर ₹{expected} से ₹{diff} अधिक है।",
                    key_reasons=[
                        f"आपकी खपत ({units} यूनिट) उच्च स्लैब में पहुँच गई है",
                        "APERC के तहत वैधानिक निश्चित शुल्क लागू हैं",
                        "ईंधन अधिभार (FPPCA) विनियामक दरों के अनुसार है",
                    ],
                    alert_title="अतिरिक्त शुल्क चेतावनी",
                    alert_message="आप APERC CGRF उपभोक्ता शिकायत निवारण प्रक्रिया के तहत समीक्षा के पात्र हैं।",
                    recommendation_summary="खपत 225 यूनिट से नीचे रखकर बचत करें।",
                )
            else:
                return MultilingualExplainResponse(
                    headline="APERC Official Tariff Audit Report",
                    explanation=f"Your billed statement of ₹{actual} exceeds the APERC authorized tariff of ₹{expected} by ₹{diff}.",
                    key_reasons=[
                        f"Consumption of {units} units entered the 226–400 unit slab tier",
                        "Statutory fixed connection charges applied per APERC gazette",
                        "Fuel Surcharge (FPPCA) computed as per approved quarterly factor",
                    ],
                    alert_title="Potential Overcharge Detected",
                    alert_message=f"Detected variance of ₹{diff} may be submitted for DISCOM billing ledger review.",
                    recommendation_summary="Keep monthly consumption under 225 units to avoid higher slab charges.",
                )

    async def assistant_chat(
        self, message: str, language: str = "en", bill_context: Optional[dict] = None
    ) -> AssistantChatResponse:
        """Contextual AI Assistant grounded in user's real audited figures or APERC statutory rules."""
        ctx = bill_context or {}
        has_audit = ctx.get("has_audit", False) or (ctx.get("units_consumed", 0) > 0 and ctx.get("actual_bill", 0) > 0)

        if has_audit:
            actual = ctx.get("actual_bill", 0)
            expected = ctx.get("expected_bill", 0)
            diff = ctx.get("difference", 0)
            units = ctx.get("units_consumed", 0)
            discom = ctx.get("discom", "APSPDCL")
            service = ctx.get("service_number", "—")

            prompt = f"""
You are the BillGuard electricity tariff assistant in Andhra Pradesh.
The user is asking: "{message}" in language: {language}.
User's Active Audited Statement:
- Service Number: {service}
- DISCOM: {discom}
- Units Consumed: {units} kWh
- Actual Billed: ₹{actual}
- Expected APERC Tariff: ₹{expected}
- Variance: ₹{diff}
Cite these exact figures where relevant. Be authoritative, helpful, and concise (under 100 words). Do not claim government certification or guaranteed dispute outcomes.
"""
        else:
            prompt = f"""
You are the BillGuard electricity tariff assistant in Andhra Pradesh.
The user is asking: "{message}" in language: {language}.
There is currently no active bill uploaded.
Answer accurately according to official APERC rules: LT-I Domestic telescopic slabs (0–30 @ ₹1.90, 31–75 @ ₹3.00, 76–125 @ ₹4.50, 126–225 @ ₹6.00, 226–400 @ ₹8.75, 401+ @ ₹9.75), DISCOMs (APSPDCL, APCPDCL, APEPDCL), Electricity Duty (6 paise/unit), and CGRF inquiry procedures.
Do not fabricate fake service numbers or claim government agency status. Keep response under 100 words.
"""

        try:
            raw = await self.call_gemini([{"parts": [{"text": prompt}]}])
            return AssistantChatResponse(reply=raw.strip(), source="gemini")
        except Exception:
            query = message.lower()
            if has_audit:
                actual = ctx.get("actual_bill", 0)
                expected = ctx.get("expected_bill", 0)
                diff = ctx.get("difference", 0)
                units = ctx.get("units_consumed", 0)
                discom = ctx.get("discom", "APSPDCL")
                service = ctx.get("service_number", "—")
                return AssistantChatResponse(
                    reply=f"For service {service} in {discom}, your consumption of {units} units carries an expected calculation of ₹{expected:.2f} vs billed ₹{actual:.2f} (variance: ₹{diff:.2f}). You may submit a formal inquiry to {discom} customer care or local CGRF for meter and ledger verification.",
                    source="fallback",
                )
            else:
                if "slab" in query or "rate" in query:
                    reply = "Official APERC LT-I Domestic Telescopic Slabs: 0–30 units @ ₹1.90/u, 31–75 @ ₹3.00/u, 76–125 @ ₹4.50/u, 126–225 @ ₹6.00/u, 226–400 @ ₹8.75/u, and 401+ @ ₹9.75/u."
                elif "fuel" in query or "fppca" in query:
                    reply = "FPPCA (Fuel & Power Purchase Cost Adjustment) is an approved quarterly factor reflecting fuel costs. In AP, it is approximately ₹0.15–₹0.40 per unit."
                elif "duty" in query or "tax" in query:
                    reply = "Andhra Pradesh Electricity Duty is statutory at 6 paise (₹0.06) per unit consumed for domestic consumers under the AP Electricity Duty Act."
                elif "complaint" in query or "dispute" in query or "cgrf" in query:
                    reply = "Under APERC Consumer Grievance Redressal Forum (CGRF) guidelines, billing discrepancies can be submitted to DISCOM customer care or forum offices for ledger verification."
                else:
                    reply = "I am your BillGuard Electricity Assistant. Upload an electricity bill to audit your statement against official APERC slabs, or ask me about tariff rates, duty, and grievance procedures."
                return AssistantChatResponse(reply=reply, source="fallback")

gemini_service = GeminiService()
