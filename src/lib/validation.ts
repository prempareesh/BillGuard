import type { APDiscom, APConsumerCategory } from "./apTariffEngine.ts";

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

  // Check meter reading delta sanity if both current and previous readings exist
  if (
    data.currentReading > 0 &&
    data.previousReading > 0 &&
    data.currentReading > data.previousReading
  ) {
    const delta = data.currentReading - data.previousReading;
    if (data.unitsConsumed > 0 && Math.abs(delta - data.unitsConsumed) > 2) {
      units = "Needs Review";
      needsReview = true;
    }
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
