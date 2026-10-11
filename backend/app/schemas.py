from typing import List, Optional, Literal
from pydantic import BaseModel, Field

APDiscom = Literal["APSPDCL", "APCPDCL", "APEPDCL"]
APConsumerCategory = Literal["Domestic", "Commercial"]
ValidationStatus = Literal["Validated", "Needs Review", "Missing", "Corrected by User"]

class PresignedUploadRequest(BaseModel):
    filename: str
    content_type: str = "application/pdf"
    file_size_bytes: int

class PresignedUploadResponse(BaseModel):
    upload_url: str
    object_key: str
    bucket: str
    fields: dict = Field(default_factory=dict)
    direct_upload_fallback: bool = False

class ExtractedBillData(BaseModel):
    consumer_name: str = ""
    consumer_number: str = ""
    service_number: str = ""
    discom: APDiscom = "APSPDCL"
    consumer_category: APConsumerCategory = "Domestic"
    billing_month: str = "August 2026"
    units_consumed: float = 0.0
    bill_amount: float = 0.0
    fixed_charges: float = 30.0
    taxes: float = 0.0
    fuel_adjustment_charges: float = 0.0
    previous_reading: Optional[float] = None
    current_reading: Optional[float] = None
    due_date: str = ""
    is_demo: bool = False

class FieldValidationItem(BaseModel):
    field_name: str
    extracted_value: str
    status: ValidationStatus
    reason: str

class OCRValidationResult(BaseModel):
    overall_status: Literal["Validated", "Needs Review"]
    arithmetic_reconciled: bool
    fields: List[FieldValidationItem]
    warnings: List[str] = Field(default_factory=list)

class OCRExtractResponse(BaseModel):
    success: bool
    data: ExtractedBillData
    validation: OCRValidationResult
    document_s3_key: Optional[str] = None
    source: str = "gemini"

class SlabCalculationItem(BaseModel):
    slab_range: str
    units_in_slab: float
    rate_per_unit: float
    cost: float
    percentage_of_energy: float

class TariffAuditRequest(BaseModel):
    discom: APDiscom = "APSPDCL"
    consumer_category: APConsumerCategory = "Domestic"
    units_consumed: float
    actual_bill_amount: float
    billing_month: str = "August 2026"
    fixed_charges: Optional[float] = None
    meter_read_previous: Optional[float] = None
    meter_read_current: Optional[float] = None
    consumer_name: Optional[str] = None
    service_number: Optional[str] = None
    consumer_number: Optional[str] = None
    fuel_adjustment_charges: Optional[float] = None
    taxes: Optional[float] = None
    is_demo: Optional[bool] = False

class TariffAuditResponse(BaseModel):
    audit_certificate_id: str
    audit_reference_id: Optional[str] = None
    timestamp: str
    discom: APDiscom
    discom_full_name: str
    consumer_category: APConsumerCategory
    billing_month: str
    financial_year: str = "2026-27"
    tariff_schedule_version: str = "APERC-TO-2026-27"
    tariff_schedule_status: str = "Verified Official"
    tariff_citation: Optional[str] = None
    schedule_trace_explanation: Optional[str] = None
    is_demo: bool = False
    units_consumed: float
    meter_match: bool
    meter_delta_units: Optional[float] = None

    expected_bill: float
    actual_bill: float
    difference: float
    percentage_difference: float
    rounded_payable_amount: Optional[float] = None
    rounding_adjustment: Optional[float] = None

    status: Literal["Verified", "Review Recommended", "Potential Overcharge", "Incomplete Audit"]
    status_variant: Literal["green", "orange", "red"]
    anomaly_type: Literal["Overcharged", "Undercharged", "Normal", "Incomplete"]

    slabs: List[SlabCalculationItem]
    total_energy_charges: float
    fixed_charges: float
    electricity_duty: float
    fppca_fuel_surcharge: float
    customer_charges: float
    subtotal: float

    calculation_formula: str
    highest_slab_applied: str
    variance_explanation: str
    regulation_reference: str
    timeline_reference: str
    dispute_eligibility: str

class MultilingualExplainRequest(BaseModel):
    language: Literal["en", "te", "hi"] = "en"
    audit_data: dict

class MultilingualExplainResponse(BaseModel):
    headline: str
    explanation: str
    key_reasons: List[str]
    alert_title: str
    alert_message: str
    recommendation_summary: str

class AssistantChatRequest(BaseModel):
    message: str
    language: Literal["en", "te", "hi"] = "en"
    bill_context: Optional[dict] = None

class AssistantChatResponse(BaseModel):
    reply: str
    source: str = "gemini"

class StoredAuditRecord(BaseModel):
    id: str
    timestamp: str
    consumer_name: str
    service_number: str
    consumer_number: str
    discom: APDiscom
    billing_month: str
    units_consumed: float
    expected_amount: float
    actual_amount: float
    difference: float
    status: str
    tariff_schedule_version: Optional[str] = "APERC-TO-2024-25"
    s3_document_key: Optional[str] = None

class StoredComplaintRecord(BaseModel):
    id: str
    audit_id: str
    consumer_number: str
    discom: str
    actual_bill: float
    expected_bill: float
    difference: float
    status: str
    created_at: str
    complaint_letter_text: Optional[str] = None
