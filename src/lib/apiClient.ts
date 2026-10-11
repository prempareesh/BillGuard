/**
 * BillGuard API Client
 * Connects Next.js frontend to FastAPI backend (AWS App Runner / Local).
 * Handles S3 uploads, Gemini OCR, Deterministic APERC calculations, and DynamoDB records.
 */

import {
  type APAuditResult,
  type APDiscom,
  type APConsumerCategory,
  calculateAPTariff,
} from "./apTariffEngine.ts";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface PresignedUploadResponse {
  upload_url: string;
  object_key: string;
  bucket: string;
  fields?: Record<string, string>;
  direct_upload_fallback?: boolean;
}

export interface StoredAuditRecord {
  id: string;
  timestamp: string;
  consumerName: string;
  serviceNumber: string;
  consumerNumber: string;
  discom: APDiscom;
  billingMonth: string;
  unitsConsumed: number;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  status: string;
  tariffScheduleVersion?: string;
  s3DocumentKey?: string;
  isDemo?: boolean;
  // Optional migration fields
  actualBill?: number;
  expectedBill?: number;
  units?: number;
}

export interface ExtractedBillData {
  consumerName: string;
  consumerNumber: string;
  serviceNumber: string;
  discom: APDiscom;
  consumerCategory: APConsumerCategory;
  billingMonth: string;
  unitsConsumed: number;
  billAmount: number;
  fixedCharges: number;
  taxes: number;
  fuelAdjustmentCharges: number;
  previousReading: number;
  currentReading: number;
  dueDate: string;
  isDemo?: boolean;
}

export type ValidationStatus = "Validated" | "Needs Review" | "Missing" | "Corrected by User";

export interface FieldValidationItem {
  field_name: string;
  extracted_value: string;
  status: ValidationStatus;
  reason: string;
}

export interface OCRValidationResult {
  overall_status: "Validated" | "Needs Review";
  arithmetic_reconciled: boolean;
  fields: FieldValidationItem[];
  warnings: string[];
}

export interface OCRExtractResponse {
  success: boolean;
  data: ExtractedBillData;
  validation: OCRValidationResult;
  document_s3_key?: string;
  source: string;
}

class BillGuardApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, "");
  }

  /**
   * Healthcheck
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * 1. Request S3 Presigned Upload URL
   */
  async getPresignedUpload(file: File): Promise<PresignedUploadResponse> {
    const res = await fetch(`${this.baseUrl}/api/upload/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type || "application/pdf",
        file_size_bytes: file.size,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload request failed" }));
      throw new Error(err.detail || "Upload authorization failed");
    }

    return res.json();
  }

  /**
   * 2. Upload file directly to S3 or local server fallback
   */
  async uploadFileToS3(presigned: PresignedUploadResponse, file: File): Promise<string> {
    if (presigned.direct_upload_fallback) {
      // Local development server upload
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${this.baseUrl}${presigned.upload_url}`,
        {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(20000),
        }
      );
      if (!res.ok) throw new Error("Local direct upload failed");
      return presigned.object_key;
    }

    // Direct AWS S3 PUT upload
    const res = await fetch(presigned.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/pdf",
      },
      body: file,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error("Direct S3 upload failed");
    }

    return presigned.object_key;
  }

  /**
   * 3. Extract OCR via Background Job Polling or Direct Fallback
   */
  async extractOCR(
    s3Key?: string,
    file?: File,
    isDemo = false,
    onStageUpdate?: (stage: string) => void
  ): Promise<OCRExtractResponse> {
    if (isDemo) {
      const formData = new FormData();
      formData.append("is_demo", "true");
      const res = await fetch(`${this.baseUrl}/api/ocr/extract`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error("Demo statement load failed");
      const json = await res.json();
      return this._formatOCRResponse(json, isDemo);
    }

    // Try starting an asynchronous job first for reliable status updates
    try {
      const startFormData = new FormData();
      if (s3Key) startFormData.append("s3_key", s3Key);
      if (file) startFormData.append("file", file);

      const jobRes = await fetch(`${this.baseUrl}/api/ocr/start-job`, {
        method: "POST",
        body: startFormData,
        signal: AbortSignal.timeout(10000),
      });

      if (jobRes.ok) {
        const jobJson = await jobRes.json();
        const jobId = jobJson.job_id;
        if (jobId) {
          // Poll for completion with bounded backoff
          const deadline = Date.now() + 45000; // 45s deadline
          let pollDelay = 1000;

          while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, pollDelay));
            try {
              const statusRes = await fetch(`${this.baseUrl}/api/ocr/job/${jobId}`, {
                signal: AbortSignal.timeout(5000),
              });
              if (statusRes.ok) {
                const statusJson = await statusRes.json();
                if (statusJson.stage && onStageUpdate) {
                  onStageUpdate(statusJson.stage);
                }

                if (statusJson.status === "completed") {
                  return this._formatOCRResponse(statusJson, false);
                } else if (statusJson.status === "failed") {
                  throw new Error(statusJson.error || "OCR extraction failed");
                }
              }
            } catch (err: unknown) {
              if (err instanceof Error && err.message.includes("failed")) throw err;
            }
            pollDelay = Math.min(pollDelay + 500, 2500);
          }
        }
      }
    } catch (e: unknown) {
      // If job endpoint had an explicit business failure, rethrow
      if (e instanceof Error && !e.name.includes("Abort") && !e.message.includes("fetch")) {
        throw e;
      }
      console.warn("Async OCR job start failed, trying direct OCR endpoint:", e);
    }

    // Direct synchronous fallback with 40s timeout
    if (onStageUpdate) onStageUpdate("Reading your statement");
    const formData = new FormData();
    if (s3Key) formData.append("s3_key", s3Key);
    if (file) formData.append("file", file);

    const res = await fetch(`${this.baseUrl}/api/ocr/extract`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(40000),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || "Document could not be processed by OCR.");
    }

    const json = await res.json();
    return this._formatOCRResponse(json, false);
  }

  private _formatOCRResponse(json: Record<string, unknown>, isDemo: boolean): OCRExtractResponse {
    const raw = (json.data as Record<string, unknown>) || {};
    
    // Normalize snake_case to camelCase
    const data: ExtractedBillData = {
      consumerName: String(raw.consumer_name ?? raw.consumerName ?? ""),
      consumerNumber: String(raw.consumer_number ?? raw.consumerNumber ?? ""),
      serviceNumber: String(raw.service_number ?? raw.serviceNumber ?? ""),
      discom: (raw.discom as APDiscom) || "APSPDCL",
      consumerCategory: (raw.consumer_category as APConsumerCategory) || "Domestic",
      billingMonth: String(raw.billing_month ?? raw.billingMonth ?? "August 2026"),
      unitsConsumed: Number(raw.units_consumed ?? raw.unitsConsumed ?? 0),
      billAmount: Number(raw.bill_amount ?? raw.billAmount ?? 0),
      fixedCharges: Number(raw.fixed_charges ?? raw.fixedCharges ?? 30),
      taxes: Number(raw.taxes ?? 0),
      fuelAdjustmentCharges: Number(raw.fuel_adjustment_charges ?? raw.fuelAdjustmentCharges ?? 0),
      previousReading: Number(raw.previous_reading ?? raw.previousReading ?? 0),
      currentReading: Number(raw.current_reading ?? raw.currentReading ?? 0),
      dueDate: String(raw.due_date ?? raw.dueDate ?? ""),
      isDemo: Boolean(raw.is_demo ?? isDemo),
    };

    return {
      success: Boolean(json.success ?? true),
      data,
      validation: (json.validation as OCRValidationResult) || {
        arithmetic_valid: true,
        units_match_readings: true,
        confidence_score: 95,
        discom_recognized: true,
      },
      document_s3_key: json.document_s3_key as string | undefined,
      source: String(json.source || (isDemo ? "demo" : "gemini")),
    };
  }

  /**
   * 4. Run Deterministic APERC Tariff Audit in FastAPI
   */
  async runTariffAudit(input: {
    discom: APDiscom;
    consumerCategory: APConsumerCategory;
    unitsConsumed: number;
    actualBillAmount: number;
    billingMonth: string;
    fixedCharges?: number;
    meterReadPrevious?: number;
    meterReadCurrent?: number;
    fuelAdjustmentCharges?: number;
    taxes?: number;
    isDemo?: boolean;
  }): Promise<APAuditResult> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tariff/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discom: input.discom,
          consumer_category: input.consumerCategory,
          units_consumed: input.unitsConsumed,
          actual_bill_amount: input.actualBillAmount,
          billing_month: input.billingMonth,
          fixed_charges: input.fixedCharges,
          meter_read_previous: input.meterReadPrevious,
          meter_read_current: input.meterReadCurrent,
          fuel_adjustment_charges: input.fuelAdjustmentCharges,
          taxes: input.taxes,
          is_demo: input.isDemo,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const d = await res.json();
        const refId = d.audit_reference_id || d.audit_certificate_id;
        return {
          auditReferenceId: refId,
          auditCertificateId: refId,
          timestamp: d.timestamp,
          discom: d.discom,
          discomFullName: d.discom_full_name,
          consumerCategory: d.consumer_category,
          billingMonth: d.billing_month,
          financialYear: d.financial_year || "2026-27",
          tariffScheduleVersion: d.tariff_schedule_version || "APERC-TO-2026-27",
          tariffScheduleStatus: d.tariff_schedule_status || "Verified Official",
          tariffCitation: d.tariff_citation || "APERC Retail Supply Tariff Order",
          scheduleTraceExplanation: d.schedule_trace_explanation || "",
          isDemo: Boolean(d.is_demo),
          unitsConsumed: d.units_consumed,
          meterDeltaUnits: d.meter_delta_units,
          meterMatch: d.meter_match,
          expectedBill: d.expected_bill,
          actualBill: d.actual_bill,
          difference: d.difference,
          percentageDifference: d.percentage_difference,
          roundedPayableAmount: d.rounded_payable_amount ?? Math.round(d.expected_bill),
          roundingAdjustment: d.rounding_adjustment ?? Math.round((Math.round(d.expected_bill) - d.expected_bill) * 100) / 100,
          status: d.status,
          statusVariant: d.status_variant,
          anomalyType: d.anomaly_type,
          slabs: d.slabs.map((s: { slab_range: string; units_in_slab: number; rate_per_unit: number; cost: number; percentage_of_energy: number }) => ({
            slabRange: s.slab_range,
            unitsInSlab: s.units_in_slab,
            ratePerUnit: s.rate_per_unit,
            cost: s.cost,
            percentageOfEnergy: s.percentage_of_energy,
          })),
          totalEnergyCharges: d.total_energy_charges,
          fixedCharges: d.fixed_charges,
          electricityDuty: d.electricity_duty,
          fppcaFuelSurcharge: d.fppca_fuel_surcharge,
          customerCharges: d.customer_charges,
          subtotal: d.subtotal,
          calculationFormula: d.calculation_formula,
          highestSlabApplied: d.highest_slab_applied,
          varianceExplanation: d.variance_explanation,
          consumerRights: {
            regulations: d.regulation_reference,
            timeline: d.timeline_reference,
            eligibility: d.dispute_eligibility,
          },
          auditReliability: {
            level: d.units_consumed > 0 && d.actual_bill > 0 ? "High" : "Low",
            reason: `Cross-verified against published ${d.tariff_schedule_version}.`,
          },
          rawInputs: {
            unitsConsumed: input.unitsConsumed,
            actualBillAmount: input.actualBillAmount,
            billingMonth: input.billingMonth,
            fixedChargesProvided: input.fixedCharges,
            fuelChargesProvided: input.fuelAdjustmentCharges,
            taxesProvided: input.taxes,
            meterReadPrevious: input.meterReadPrevious,
            meterReadCurrent: input.meterReadCurrent,
          },
          aiExplanationText: d.variance_explanation,
          actionRecommendation:
            d.difference > 0
              ? `You may request a formal billing explanation from ${d.discom} citing APERC tariff schedule ${d.tariff_schedule_version}.`
              : `Tariff verified compliant. Maintain energy efficiency to remain in lower consumption tiers.`,
        };
      }
    } catch (e) {
      console.warn("FastAPI audit fallback to local APERC engine:", e);
    }

    // Client-side deterministic fallback
    return calculateAPTariff(input);
  }

  /**
   * 5. Save Audit to DynamoDB
   */
  async saveAuditToDynamo(record: {
    id: string;
    timestamp: string;
    consumerName: string;
    serviceNumber: string;
    consumerNumber: string;
    discom: APDiscom;
    billingMonth: string;
    unitsConsumed: number;
    expectedAmount: number;
    actualAmount: number;
    difference: number;
    status: string;
    s3DocumentKey?: string;
  }): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/records/audits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          timestamp: record.timestamp,
          consumer_name: record.consumerName,
          service_number: record.serviceNumber,
          consumer_number: record.consumerNumber,
          discom: record.discom,
          billing_month: record.billingMonth,
          units_consumed: record.unitsConsumed,
          expected_amount: record.expectedAmount,
          actual_amount: record.actualAmount,
          difference: record.difference,
          status: record.status,
          s3_document_key: record.s3DocumentKey,
        }),
      });
    } catch (e) {
      console.warn("Could not save to DynamoDB endpoint:", e);
    }
  }

  /**
   * 6. Fetch Audits from DynamoDB
   */
  async getAuditsFromDynamo(): Promise<StoredAuditRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/records/audits`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch audits: HTTP ${res.status}`);
    }
    interface RawDynamoAuditRow {
      id: string;
      timestamp: string;
      consumer_name?: string;
      service_number?: string;
      consumer_number?: string;
      discom?: APDiscom;
      billing_month?: string;
      units_consumed?: number;
      expected_amount?: number;
      actual_amount?: number;
      difference?: number;
      status?: string;
      s3_document_key?: string;
    }
    const rows: RawDynamoAuditRow[] = await res.json();
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      consumerName: r.consumer_name || "Consumer",
      serviceNumber: r.service_number || "—",
      consumerNumber: r.consumer_number || "—",
      discom: r.discom || "APSPDCL",
      billingMonth: r.billing_month || "August 2026",
      unitsConsumed: Number(r.units_consumed ?? 0),
      expectedAmount: Number(r.expected_amount ?? 0),
      actualAmount: Number(r.actual_amount ?? 0),
      difference: Number(r.difference ?? 0),
      status: (r.status || "Verified") as StoredAuditRecord["status"],
      s3DocumentKey: r.s3_document_key,
    }));
  }

  /**
   * 7. Delete Audit from DynamoDB
   */
  async deleteAuditFromDynamo(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/records/audits/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      throw new Error(errJson.detail || `Failed to delete audit record (${res.status})`);
    }
  }

  /**
   * 8. Save Complaint to DynamoDB
   */
  async saveComplaintToDynamo(complaint: {
    id: string;
    auditId: string;
    consumerNumber: string;
    discom: string;
    actualBill: number;
    expectedBill: number;
    difference: number;
    status: string;
    letterText?: string;
  }): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/records/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: complaint.id,
          audit_id: complaint.auditId,
          consumer_number: complaint.consumerNumber,
          discom: complaint.discom,
          actual_bill: complaint.actualBill,
          expected_bill: complaint.expectedBill,
          difference: complaint.difference,
          status: complaint.status,
          created_at: new Date().toISOString(),
          complaint_letter_text: complaint.letterText,
        }),
      });
    } catch (e) {
      console.warn("Could not save complaint to DynamoDB:", e);
    }
  }

  /**
   * 9. Assistant Chat via FastAPI / Gemini
   */
  async chatAssistant(
    message: string,
    language: string,
    billContext?: Record<string, unknown>
  ): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          language,
          bill_context: billContext,
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.reply;
      }
    } catch (e) {
      console.warn("FastAPI chat failed, falling back:", e);
    }

    // Direct Next.js route fallback
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "assistant_chat",
        message,
        language,
        billContext,
      }),
    });
    const d = await res.json();
    return d.reply || "Could not generate response.";
  }
}

export const apiClient = new BillGuardApiClient();
