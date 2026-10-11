import { create } from "zustand";
import {
  APAuditResult,
  APDiscom,
  APConsumerCategory,
  calculateAPTariff,
} from "./apTariffEngine";
import {
  dbSaveAudit,
  dbSaveComplaint,
  dbSaveUserBill,
  dbGetAudits,
  dbDeleteAudit,
} from "./dynamoStore";
import { apiClient } from "./apiClient";
import i18n from "./i18n";

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
}

export type FieldValidationStatus = "Verified" | "Needs Review" | "Missing" | "Corrected by User";

export interface OCRValidationState {
  consumerNumber: FieldValidationStatus;
  units: FieldValidationStatus;
  billAmount: FieldValidationStatus;
  billingDate: FieldValidationStatus;
  tariffCategory: FieldValidationStatus;
  reliability: "High" | "Medium" | "Low";
  isNeedsReview: boolean;
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
  status: "Verified" | "Review Recommended" | "Potential Overcharge" | "Incomplete Audit";
  s3DocumentKey?: string;
  tariffScheduleVersion?: string;
  isDemo?: boolean;
  // Legacy / migration compatibility
  actualBill?: number;
  expectedBill?: number;
  units?: number;
  actual_amount?: number;
  expected_amount?: number;
  units_consumed?: number;
  audit_timestamp?: string;
  consumer_name?: string;
  service_number?: string;
  consumer_number?: string;
  billing_month?: string;
}

export interface AuditStoreState {
  uploadedFile: {
    name: string;
    size: number;
    previewUrl: string;
    s3Key?: string;
  } | null;
  pipelineStep: number; // 0: Idle/Upload, 1: Validating & S3 Upload, 2: Gemini OCR, 3: Review Fields, 4: APERC Audit, 5: Complete
  isAnalyzing: boolean;
  uploadProgress: number; // 0 to 100%
  uploadError: string | null;
  processingStageText: string;
  isDemoBill: boolean;
  activeLanguage: "en" | "te" | "hi";
  extractedData: ExtractedBillData;
  ocrValidation: OCRValidationState;
  auditResult: APAuditResult | null;
  activeAuditId: string | null;
  historyList: StoredAuditRecord[];
  isOcrConfirmed: boolean;

  // Actions
  uploadBill: (file: File) => Promise<void>;
  replaceBill: (file: File) => Promise<void>;
  retryLastUpload: () => Promise<void>;
  loadDemoBill: (demoIndex?: number) => Promise<void>;
  removeBill: () => void;
  loadAuditFromHistory: (record: StoredAuditRecord) => void;
  clearUploadError: () => void;
  updateExtractedField: <K extends keyof ExtractedBillData>(
    field: K,
    value: ExtractedBillData[K]
  ) => void;
  confirmOcrAndAudit: () => Promise<void>;
  setLanguage: (lang: "en" | "te" | "hi") => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const EMPTY_EXTRACTED: ExtractedBillData = {
  consumerName: "",
  consumerNumber: "",
  serviceNumber: "",
  discom: "APSPDCL",
  consumerCategory: "Domestic",
  billingMonth: "August 2026",
  unitsConsumed: 0,
  billAmount: 0,
  fixedCharges: 30,
  taxes: 0,
  fuelAdjustmentCharges: 0,
  previousReading: 0,
  currentReading: 0,
  dueDate: "",
};

export const DEFAULT_EXTRACTED: ExtractedBillData = {
  consumerName: "K. Raghunath Reddy",
  consumerNumber: "1429810342",
  serviceNumber: "NEL-04-12948",
  discom: "APSPDCL",
  consumerCategory: "Domestic",
  billingMonth: "August 2026",
  unitsConsumed: 320,
  billAmount: 2850,
  fixedCharges: 30,
  taxes: 19,
  fuelAdjustmentCharges: 48,
  previousReading: 14210,
  currentReading: 14530,
  dueDate: "24-08-2026",
};

export function validateExtractedFields(data: ExtractedBillData): OCRValidationState {
  let needsReview = false;
  let missingCount = 0;

  let consumerNumber: FieldValidationStatus = "Verified";
  if (!data.consumerNumber || data.consumerNumber.trim().length === 0) {
    consumerNumber = "Missing";
    missingCount++;
  } else if (data.consumerNumber.length < 5) {
    consumerNumber = "Needs Review";
    needsReview = true;
  }

  let units: FieldValidationStatus = "Verified";
  if (!data.unitsConsumed || data.unitsConsumed <= 0) {
    units = "Missing";
    missingCount++;
  } else if (data.unitsConsumed > 2500) {
    units = "Needs Review";
    needsReview = true;
  }

  let billAmount: FieldValidationStatus = "Verified";
  if (!data.billAmount || data.billAmount <= 0) {
    billAmount = "Missing";
    missingCount++;
  }

  const billingDate: FieldValidationStatus = data.billingMonth ? "Verified" : "Needs Review";
  const tariffCategory: FieldValidationStatus = data.consumerCategory ? "Verified" : "Needs Review";

  let reliability: "High" | "Medium" | "Low" = "High";
  if (missingCount >= 2) {
    reliability = "Low";
  } else if (missingCount > 0 || needsReview) {
    reliability = "Medium";
  }

  return {
    consumerNumber,
    units,
    billAmount,
    billingDate,
    tariffCategory,
    reliability,
    isNeedsReview: needsReview || missingCount > 0,
  };
}

export const DEFAULT_AUDIT: APAuditResult = calculateAPTariff({
  discom: DEFAULT_EXTRACTED.discom,
  consumerCategory: DEFAULT_EXTRACTED.consumerCategory,
  unitsConsumed: DEFAULT_EXTRACTED.unitsConsumed,
  actualBillAmount: DEFAULT_EXTRACTED.billAmount,
  billingMonth: DEFAULT_EXTRACTED.billingMonth,
  fixedCharges: DEFAULT_EXTRACTED.fixedCharges,
  meterReadPrevious: DEFAULT_EXTRACTED.previousReading,
  meterReadCurrent: DEFAULT_EXTRACTED.currentReading,
  fuelAdjustmentCharges: DEFAULT_EXTRACTED.fuelAdjustmentCharges,
  taxes: DEFAULT_EXTRACTED.taxes,
  isDemo: true,
});

export const DEFAULT_HISTORY_RECORD: StoredAuditRecord = {
  id: "AUD-APSPDCL-BASELINE",
  timestamp: "24 Aug 2026, 11:30 AM",
  consumerName: DEFAULT_EXTRACTED.consumerName,
  serviceNumber: DEFAULT_EXTRACTED.serviceNumber,
  consumerNumber: DEFAULT_EXTRACTED.consumerNumber,
  discom: DEFAULT_EXTRACTED.discom,
  billingMonth: DEFAULT_EXTRACTED.billingMonth,
  unitsConsumed: DEFAULT_EXTRACTED.unitsConsumed,
  expectedAmount: DEFAULT_AUDIT.expectedBill,
  actualAmount: DEFAULT_AUDIT.actualBill,
  difference: DEFAULT_AUDIT.difference,
  status: DEFAULT_AUDIT.status,
  tariffScheduleVersion: DEFAULT_AUDIT.tariffScheduleVersion,
  isDemo: true,
};

function getStoredHistory(): StoredAuditRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("billguard_audit_history");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seen = new Set<string>();
        const sanitized: StoredAuditRecord[] = [];
        for (const item of parsed) {
          const id = item.id || `AUD-${Math.random().toString(36).slice(2, 8)}`;
          if (!seen.has(id)) {
            seen.add(id);
            const actual = Number(item.actualAmount ?? item.actual_amount ?? item.actualBill ?? 0);
            const expected = Number(item.expectedAmount ?? item.expected_amount ?? item.expectedBill ?? 0);
            const diff = Number(item.difference ?? (actual - expected));
            sanitized.push({
              id,
              timestamp: item.timestamp || item.audit_timestamp || "Just now",
              consumerName: item.consumerName || item.consumer_name || "Consumer",
              serviceNumber: item.serviceNumber || item.service_number || "—",
              consumerNumber: item.consumerNumber || item.consumer_number || "—",
              discom: item.discom || "APSPDCL",
              billingMonth: item.billingMonth || item.billing_month || "August 2026",
              unitsConsumed: Number(item.unitsConsumed ?? item.units_consumed ?? item.units ?? 0),
              expectedAmount: expected,
              actualAmount: actual,
              difference: diff,
              status: (item.status as StoredAuditRecord["status"]) || (diff >= 100 ? "Potential Overcharge" : diff > 0 ? "Review Recommended" : "Verified"),
              s3DocumentKey: item.s3DocumentKey,
            });
          }
        }
        if (sanitized.length > 0) return sanitized;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

let lastUploadedRawFile: File | null = null;

function getInitialLanguage(): "en" | "te" | "hi" {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem("billguard_language");
    if (saved === "te" || saved === "hi" || saved === "en") return saved;
  } catch {
    // ignore
  }
  return "en";
}

function getInitialActiveAuditSession() {
  if (typeof window === "undefined") {
    return {
      auditResult: null as APAuditResult | null,
      activeAuditId: null as string | null,
      extractedData: EMPTY_EXTRACTED,
      ocrValidation: validateExtractedFields(EMPTY_EXTRACTED),
      pipelineStep: 0,
      uploadedFile: null as AuditStoreState["uploadedFile"],
      isDemoBill: false,
      isOcrConfirmed: false,
    };
  }
  try {
    const raw = sessionStorage.getItem("billguard_active_audit");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.auditResult) {
        return {
          auditResult: parsed.auditResult as APAuditResult,
          activeAuditId: (parsed.activeAuditId as string) || null,
          extractedData: (parsed.extractedData as ExtractedBillData) || EMPTY_EXTRACTED,
          ocrValidation: (parsed.ocrValidation as OCRValidationState) || validateExtractedFields(parsed.extractedData || EMPTY_EXTRACTED),
          pipelineStep: Number(parsed.pipelineStep || 5),
          uploadedFile: (parsed.uploadedFile as AuditStoreState["uploadedFile"]) || null,
          isDemoBill: Boolean(parsed.isDemoBill),
          isOcrConfirmed: Boolean(parsed.isOcrConfirmed ?? true),
        };
      }
    }
  } catch (e) {
    console.warn("Session restore warning:", e);
  }
  return {
    auditResult: null as APAuditResult | null,
    activeAuditId: null as string | null,
    extractedData: EMPTY_EXTRACTED,
    ocrValidation: validateExtractedFields(EMPTY_EXTRACTED),
    pipelineStep: 0,
    uploadedFile: null as AuditStoreState["uploadedFile"],
    isDemoBill: false,
    isOcrConfirmed: false,
  };
}

function persistActiveAuditSession(state: {
  auditResult: APAuditResult | null;
  activeAuditId?: string | null;
  extractedData?: ExtractedBillData;
  ocrValidation?: OCRValidationState;
  pipelineStep?: number;
  uploadedFile?: AuditStoreState["uploadedFile"];
  isDemoBill?: boolean;
  isOcrConfirmed?: boolean;
}) {
  if (typeof window === "undefined") return;
  try {
    if (state.auditResult) {
      sessionStorage.setItem("billguard_active_audit", JSON.stringify(state));
    } else {
      sessionStorage.removeItem("billguard_active_audit");
    }
  } catch (e) {
    console.warn("Session persistence warning:", e);
  }
}

const initialSession = getInitialActiveAuditSession();

export const useAuditStore = create<AuditStoreState>((set, get) => ({
  uploadedFile: initialSession.uploadedFile,
  pipelineStep: initialSession.pipelineStep,
  isAnalyzing: false,
  uploadProgress: initialSession.auditResult ? 100 : 0,
  uploadError: null,
  processingStageText: "Uploading your bill",
  isDemoBill: initialSession.isDemoBill,
  activeLanguage: getInitialLanguage(),
  extractedData: initialSession.extractedData,
  ocrValidation: initialSession.ocrValidation,
  auditResult: initialSession.auditResult,
  activeAuditId: initialSession.activeAuditId,
  historyList: getStoredHistory(),
  isOcrConfirmed: initialSession.isOcrConfirmed,

  clearUploadError: () => set({ uploadError: null }),


  retryLastUpload: async () => {
    if (lastUploadedRawFile) {
      await get().uploadBill(lastUploadedRawFile);
    }
  },

  refreshFromDatabase: async () => {
    try {
      const records = await dbGetAudits();
      if (Array.isArray(records)) {
        if (records.length === 0) {
          set({ historyList: [] });
          // If no audits remain on record and not in active demo, clear active session
          if (!get().isDemoBill && get().pipelineStep === 5) {
            persistActiveAuditSession({
              auditResult: null,
              pipelineStep: 0,
              isDemoBill: false,
              isOcrConfirmed: false,
              activeAuditId: null,
            });
            set({
              auditResult: null,
              activeAuditId: null,
              uploadedFile: null,
              pipelineStep: 0,
              isOcrConfirmed: false,
              extractedData: { ...EMPTY_EXTRACTED },
              ocrValidation: validateExtractedFields(EMPTY_EXTRACTED),
            });
          }
          return;
        }

        const seen = new Set<string>();
        const sanitized: StoredAuditRecord[] = [];
        for (const item of records) {
          const id = item.id || `AUD-${Math.random().toString(36).slice(2, 8)}`;
          if (!seen.has(id)) {
            seen.add(id);
            const actual = Number(item.actualAmount ?? item.actualBill ?? 0);
            const expected = Number(item.expectedAmount ?? item.expectedBill ?? 0);
            const diff = Number(item.difference ?? (actual - expected));
            sanitized.push({
              id,
              timestamp: item.timestamp || "Just now",
              consumerName: item.consumerName || "Consumer",
              serviceNumber: item.serviceNumber || "—",
              consumerNumber: item.consumerNumber || "—",
              discom: item.discom || "APSPDCL",
              billingMonth: item.billingMonth || "August 2026",
              unitsConsumed: Number(item.unitsConsumed ?? item.units ?? 0),
              expectedAmount: expected,
              actualAmount: actual,
              difference: diff,
              status: (item.status as StoredAuditRecord["status"]) || (diff >= 100 ? "Potential Overcharge" : diff > 0 ? "Review Recommended" : "Verified"),
              tariffScheduleVersion: item.tariffScheduleVersion || "APERC-TO-2026-27",
              s3DocumentKey: item.s3DocumentKey,
              isDemo: Boolean(item.isDemo),
            });
          }
        }

        const recordIds = new Set(sanitized.map((r) => r.id));
        if (
          !get().isDemoBill &&
          get().pipelineStep === 5 &&
          get().activeAuditId &&
          !recordIds.has(get().activeAuditId!)
        ) {
          persistActiveAuditSession({
            auditResult: null,
            pipelineStep: 0,
            isDemoBill: false,
            isOcrConfirmed: false,
            activeAuditId: null,
          });
          set({
            auditResult: null,
            activeAuditId: null,
            uploadedFile: null,
            pipelineStep: 0,
            isOcrConfirmed: false,
            extractedData: { ...EMPTY_EXTRACTED },
            ocrValidation: validateExtractedFields(EMPTY_EXTRACTED),
          });
        }

        set({ historyList: sanitized });
      }
    } catch (e) {
      console.warn("Could not sync with DynamoDB:", e);
    }
  },

  uploadBill: async (file: File) => {
    lastUploadedRawFile = file;

    // 1. Client-Side Validation
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    const isExtensionValid = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !isExtensionValid) {
      set({
        uploadError: "Invalid file format. Please upload a PDF, JPG, JPEG, or PNG document.",
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      set({
        uploadError: "File size exceeds 15MB limit. Please upload a smaller file.",
      });
      return;
    }

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : "";

    set({
      isAnalyzing: true,
      processingStageText: "Uploading your bill",
      uploadProgress: 20,
      uploadError: null,
      pipelineStep: 1, // Step 1: Document Upload & S3
      isDemoBill: false,
      uploadedFile: {
        name: file.name,
        size: file.size,
        previewUrl,
      },
      isOcrConfirmed: false,
      auditResult: null, // Clear transient audit
    });

    try {
      // 2. Upload to S3 (via presigned URL or direct FastAPI fallback)
      let s3Key: string | undefined;
      try {
        set({ uploadProgress: 40 });
        const presigned = await apiClient.getPresignedUpload(file);
        s3Key = await apiClient.uploadFileToS3(presigned, file);
        set((state) => ({
          uploadProgress: 60,
          uploadedFile: state.uploadedFile
            ? { ...state.uploadedFile, s3Key }
            : null,
        }));
      } catch (uploadErr) {
        console.warn("S3 upload fallback to direct extraction:", uploadErr);
      }

      // 3. Step 2: Server-side Gemini OCR Extraction with real stage progression
      set({
        pipelineStep: 2,
        uploadProgress: 75,
        processingStageText: "Reading your statement",
      });

      const ocrResponse = await apiClient.extractOCR(
        s3Key,
        file,
        false,
        (stage: string) => set({ processingStageText: stage })
      );

      const extracted = ocrResponse.data;
      const validation = validateExtractedFields(extracted);

      // 4. Step 3: Present Editable Fields for User Review
      set({
        pipelineStep: 3, // Pauses here so user can review and edit fields
        uploadProgress: 100,
        processingStageText: "Checking extracted details",
        isAnalyzing: false,
        extractedData: extracted,
        ocrValidation: validation,
        isOcrConfirmed: false,
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Upload & OCR failed:", error);
      set({
        isAnalyzing: false,
        uploadProgress: 0,
        uploadError: `Document processing failed: ${error.message}. Click Retry to try again or verify file readability.`,
        pipelineStep: 0,
      });
    }
  },

  replaceBill: async (file: File) => {
    // Discard current transient audit and load new file
    await get().uploadBill(file);
  },

  loadDemoBill: async (demoIndex = 0) => {
    set({
      isAnalyzing: true,
      uploadProgress: 20,
      uploadError: null,
      pipelineStep: 1,
      isDemoBill: true,
      uploadedFile: {
        name:
          demoIndex === 0
            ? "APSPDCL_Aug2026_Domestic_320U.pdf [SAMPLE]"
            : "APEPDCL_Oct2026_Domestic_180U.pdf [SAMPLE]",
        size: 245000,
        previewUrl: "/hero-visual.jpg",
      },
      auditResult: null,
      isOcrConfirmed: false,
    });

    await new Promise((r) => setTimeout(r, 250));
    set({ pipelineStep: 2, uploadProgress: 65 });

    const demoData: ExtractedBillData =
      demoIndex === 0
        ? { ...DEFAULT_EXTRACTED }
        : {
            consumerName: "S. Venkateswara Rao",
            consumerNumber: "2104928174",
            serviceNumber: "VIZ-02-88129",
            discom: "APEPDCL",
            consumerCategory: "Domestic",
            billingMonth: "October 2026",
            unitsConsumed: 180,
            billAmount: 1056,
            fixedCharges: 30,
            taxes: 11,
            fuelAdjustmentCharges: 27,
            previousReading: 5120,
            currentReading: 5300,
            dueDate: "18-10-2026",
          };

    const validation = validateExtractedFields(demoData);
    const audit = calculateAPTariff({
      discom: demoData.discom,
      consumerCategory: demoData.consumerCategory,
      unitsConsumed: demoData.unitsConsumed,
      actualBillAmount: demoData.billAmount,
      billingMonth: demoData.billingMonth,
      fixedCharges: demoData.fixedCharges,
      meterReadPrevious: demoData.previousReading,
      meterReadCurrent: demoData.currentReading,
      fuelAdjustmentCharges: demoData.fuelAdjustmentCharges,
      taxes: demoData.taxes,
      isDemo: true,
    });

    await new Promise((r) => setTimeout(r, 200));
    const demoFile = {
      name: demoIndex === 0
        ? "APSPDCL_Aug2026_Domestic_320U.pdf [SAMPLE]"
        : "APEPDCL_Oct2026_Domestic_180U.pdf [SAMPLE]",
      size: 245000,
      previewUrl: "/hero-visual.jpg",
    };

    set({
      pipelineStep: 5,
      uploadProgress: 100,
      isAnalyzing: false,
      extractedData: demoData,
      ocrValidation: validation,
      auditResult: audit,
      isOcrConfirmed: true,
      isDemoBill: true,
      uploadedFile: demoFile,
    });

    persistActiveAuditSession({
      auditResult: audit,
      extractedData: demoData,
      ocrValidation: validation,
      pipelineStep: 5,
      uploadedFile: demoFile,
      isDemoBill: true,
      isOcrConfirmed: true,
    });
  },

  confirmOcrAndAudit: async () => {

    set({
      isAnalyzing: true,
      pipelineStep: 4,
      processingStageText: "Calculating your expected bill",
    });
    const extracted = get().extractedData;
    const file = get().uploadedFile;

    try {
      // Run Deterministic APERC Tariff Audit in FastAPI
      const isDemo = get().isDemoBill;
      const audit = await apiClient.runTariffAudit({
        discom: extracted.discom,
        consumerCategory: extracted.consumerCategory,
        unitsConsumed: extracted.unitsConsumed,
        actualBillAmount: extracted.billAmount,
        billingMonth: extracted.billingMonth,
        fixedCharges: extracted.fixedCharges,
        meterReadPrevious: extracted.previousReading,
        meterReadCurrent: extracted.currentReading,
        fuelAdjustmentCharges: extracted.fuelAdjustmentCharges,
        taxes: extracted.taxes,
        isDemo,
      });

      // Saving stage
      set({ processingStageText: "Saving your audit" });

      // Save audit record to Amazon DynamoDB
      const now = new Date();
      const timestampStr =
        now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        ", " +
        now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

      const auditId = `AUD-${Date.now().toString(36).toUpperCase()}`;
      const newRecord: StoredAuditRecord = {
        id: auditId,
        timestamp: timestampStr,
        consumerName: extracted.consumerName || "Consumer",
        serviceNumber: extracted.serviceNumber || "—",
        consumerNumber: extracted.consumerNumber || "—",
        discom: extracted.discom,
        billingMonth: extracted.billingMonth,
        unitsConsumed: extracted.unitsConsumed,
        expectedAmount: audit.expectedBill,
        actualAmount: audit.actualBill,
        difference: audit.difference,
        status: audit.status,
        tariffScheduleVersion: audit.tariffScheduleVersion || "APERC-TO-2026-27",
        s3DocumentKey: file?.s3Key,
        isDemo,
      };

      await dbSaveAudit(newRecord);

      if (file) {
        await dbSaveUserBill({
          id: `UB-${Date.now().toString(36).toUpperCase()}`,
          fileName: file.name,
          fileSize: file.size,
          consumerNumber: extracted.consumerNumber || "—",
          units: extracted.unitsConsumed,
          amount: extracted.billAmount,
          s3Key: file.s3Key,
        });
      }

      if (audit.difference > 0) {
        await dbSaveComplaint({
          id: `CMP-${Date.now().toString(36).toUpperCase()}`,
          auditId,
          consumerNumber: extracted.consumerNumber,
          discom: extracted.discom,
          actualBill: audit.actualBill,
          expectedBill: audit.expectedBill,
          difference: audit.difference,
          status: "Generated",
          letterText: audit.varianceExplanation,
        });
      }

      const updatedHistory = [
        newRecord,
        ...get().historyList.filter((item) => item.id !== newRecord.id),
      ];

      set({
        isAnalyzing: false,
        pipelineStep: 5,
        processingStageText: "Audit completed",
        isOcrConfirmed: true,
        auditResult: audit,
        activeAuditId: auditId,
        historyList: updatedHistory,
      });

      persistActiveAuditSession({
        auditResult: audit,
        activeAuditId: auditId,
        extractedData: extracted,
        ocrValidation: get().ocrValidation,
        pipelineStep: 5,
        uploadedFile: file,
        isDemoBill: isDemo,
        isOcrConfirmed: true,
      });

    } catch (e) {
      console.error("Tariff calculation error:", e);
      set({ isAnalyzing: false });
    }
  },

  removeBill: () => {
    lastUploadedRawFile = null;
    persistActiveAuditSession({
      auditResult: null,
      activeAuditId: null,
      pipelineStep: 0,
      isDemoBill: false,
      isOcrConfirmed: false,
    });
    // Reset to empty upload state while preserving saved DynamoDB history
    set({
      uploadedFile: null,
      pipelineStep: 0,
      isAnalyzing: false,
      uploadProgress: 0,
      uploadError: null,
      processingStageText: "Uploading your bill",
      isDemoBill: false,
      auditResult: null,
      activeAuditId: null,
      isOcrConfirmed: false,
      extractedData: { ...EMPTY_EXTRACTED },
      ocrValidation: validateExtractedFields(EMPTY_EXTRACTED),
    });
  },

  loadAuditFromHistory: (record: StoredAuditRecord) => {
    const actualVal = Number(record.actualAmount ?? record.actualBill ?? 0);
    const unitsVal = Number(record.unitsConsumed ?? record.units ?? 0);
    const audit = calculateAPTariff({
      discom: record.discom || "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: unitsVal,
      actualBillAmount: actualVal,
      billingMonth: record.billingMonth || "August 2026",
      isDemo: Boolean(record.isDemo),
    });

    const reconstructedExtracted: ExtractedBillData = {
      consumerName: record.consumerName || "Consumer",
      consumerNumber: record.consumerNumber || "—",
      serviceNumber: record.serviceNumber || "—",
      discom: record.discom || "APSPDCL",
      consumerCategory: "Domestic",
      billingMonth: record.billingMonth || "August 2026",
      unitsConsumed: unitsVal,
      billAmount: actualVal,
      fixedCharges: audit.fixedCharges,
      taxes: audit.electricityDuty,
      fuelAdjustmentCharges: audit.fppcaFuelSurcharge,
      previousReading: 0,
      currentReading: unitsVal,
      dueDate: "",
    };

    const historyFile = {
      name: `${record.discom}_${record.billingMonth}_Statement.pdf`,
      size: 210000,
      previewUrl: "",
      s3Key: record.s3DocumentKey,
    };

    set({
      pipelineStep: 5,
      isAnalyzing: false,
      isDemoBill: false,
      uploadedFile: historyFile,
      extractedData: reconstructedExtracted,
      ocrValidation: validateExtractedFields(reconstructedExtracted),
      auditResult: audit,
      activeAuditId: record.id,
      isOcrConfirmed: true,
    });

    persistActiveAuditSession({
      auditResult: audit,
      activeAuditId: record.id,
      extractedData: reconstructedExtracted,
      ocrValidation: validateExtractedFields(reconstructedExtracted),
      pipelineStep: 5,
      uploadedFile: historyFile,
      isDemoBill: false,
      isOcrConfirmed: true,
    });
  },


  updateExtractedField: (field, value) => {
    const updated = { ...get().extractedData, [field]: value };
    set({
      extractedData: updated,
      ocrValidation: validateExtractedFields(updated),
    });
  },

  setLanguage: async (lang: "en" | "te" | "hi") => {
    set({ activeLanguage: lang });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("billguard_language", lang);
      } catch {
        // ignore
      }
    }
    try {
      await i18n.changeLanguage(lang);
    } catch (e) {
      console.warn(e);
    }
  },

  deleteHistoryItem: async (id: string) => {
    await dbDeleteAudit(id);
    const updated = get().historyList.filter((item) => item.id !== id);

    const currentActiveId = get().activeAuditId;
    const currentCertId = get().auditResult?.auditCertificateId;
    const currentRefId = get().auditResult?.auditReferenceId;
    const isCurrentActive =
      currentActiveId === id ||
      currentCertId === id ||
      currentRefId === id ||
      updated.length === 0;

    if (isCurrentActive) {
      persistActiveAuditSession({
        auditResult: null,
        activeAuditId: null,
        pipelineStep: 0,
        isDemoBill: false,
        isOcrConfirmed: false,
      });
      set({
        historyList: updated,
        activeAuditId: null,
        auditResult: null,
        uploadedFile: null,
        pipelineStep: 0,
        isOcrConfirmed: false,
        extractedData: { ...EMPTY_EXTRACTED },
        ocrValidation: validateExtractedFields(EMPTY_EXTRACTED),
      });
    } else {
      set({ historyList: updated });
    }

    await get().refreshFromDatabase();
  },

  clearHistory: async () => {
    const items = [...get().historyList];
    for (const item of items) {
      await dbDeleteAudit(item.id);
    }
    persistActiveAuditSession({
      auditResult: null,
      activeAuditId: null,
      pipelineStep: 0,
      isDemoBill: false,
      isOcrConfirmed: false,
    });
    set({
      historyList: [],
      activeAuditId: null,
      auditResult: null,
      uploadedFile: null,
      pipelineStep: 0,
      isOcrConfirmed: false,
      extractedData: { ...EMPTY_EXTRACTED },
      ocrValidation: validateExtractedFields(EMPTY_EXTRACTED),
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem("billguard_audit_history");
    }
    await get().refreshFromDatabase();
  },
}));
