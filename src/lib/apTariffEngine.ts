/**
 * Andhra Pradesh Electricity Regulatory Commission (APERC) Tariff Engine
 * Supports DISCOMs: APSPDCL, APCPDCL, APEPDCL
 * 100% Deterministic, Explainable, Traceable tariff mathematics.
 * Versioned against official APERC Retail Supply Tariff Orders.
 */

export type APDiscom = "APSPDCL" | "APCPDCL" | "APEPDCL";
export type APConsumerCategory = "Domestic" | "Commercial";

export interface APSlabRule {
  min: number;
  max: number; // Infinity for open-ended top slab
  rate: number; // in ₹ per unit
  label: string;
}

export interface APSlabCalculationItem {
  slabRange: string;
  unitsInSlab: number;
  ratePerUnit: number;
  cost: number;
  percentageOfEnergy: number;
}

export interface APAuditInput {
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
}

export interface CustomerChargeTier {
  maxUnits: number;
  charge: number;
}

export interface TariffScheduleOrder {
  version: string;
  orderName: string;
  financialYear: string;
  effectiveFrom: string;
  effectiveTo: string;
  isOfficialGazetted: boolean;
  citation: string;
  discoms: APDiscom[];
  domesticTelescopicSlabs: APSlabRule[];
  domesticCustomerCharges: CustomerChargeTier[];
  domesticDefaultFixedCharge: number; // ₹ per month connection baseline
  electricityDutyPerUnit: number; // ₹0.06/kWh (AP Electricity Duty Act)
  fppcaDefaultRatePerUnit: number; // ₹0.15/kWh (APERC approved quarterly factor)
  commercialSlabs: APSlabRule[];
  commercialCustomerCharge: number;
  commercialDefaultFixedCharge: number;
}

export const AP_DISCOMS: { id: APDiscom; name: string; region: string }[] = [
  {
    id: "APSPDCL",
    name: "Southern Power Distribution Company of AP Ltd",
    region: "Tirupati, Nellore, Kadapa, Chittoor, Anantapur",
  },
  {
    id: "APCPDCL",
    name: "Central Power Distribution Company of AP Ltd",
    region: "Vijayawada, Guntur, Krishna, Prakasam",
  },
  {
    id: "APEPDCL",
    name: "Eastern Power Distribution Company of AP Ltd",
    region: "Visakhapatnam, Srikakulam, Vizianagaram, Godavari",
  },
];

/**
 * Versioned, auditable APERC Retail Tariff Schedules
 */
export const TARIFF_SCHEDULE_REGISTRY: Record<string, TariffScheduleOrder> = {
  // Official APERC Retail Supply Tariff Order for FY 2026-27 (maintained FY 2025-26 tariff with zero hike)
  "APERC-TO-2026-27": {
    version: "APERC-TO-2026-27",
    orderName: "APERC Retail Supply Tariff Order FY 2026–27",
    financialYear: "2026-27",
    effectiveFrom: "2026-04-01",
    effectiveTo: "2027-03-31",
    isOfficialGazetted: true,
    citation: "APERC Retail Supply Tariff Order FY 2026-27 (Maintained FY 2025-26 tariff with zero tariff revision)",
    discoms: ["APSPDCL", "APCPDCL", "APEPDCL"],
    domesticTelescopicSlabs: [
      { min: 0, max: 30, rate: 1.9, label: "0 – 30 units" },
      { min: 31, max: 75, rate: 3.0, label: "31 – 75 units" },
      { min: 76, max: 125, rate: 4.5, label: "76 – 125 units" },
      { min: 126, max: 225, rate: 6.0, label: "126 – 225 units" },
      { min: 226, max: 400, rate: 8.75, label: "226 – 400 units" },
      { min: 401, max: Infinity, rate: 9.75, label: "401+ units" },
    ],
    domesticCustomerCharges: [
      { maxUnits: 30, charge: 25 },
      { maxUnits: 75, charge: 30 },
      { maxUnits: 125, charge: 45 },
      { maxUnits: 225, charge: 50 },
      { maxUnits: 400, charge: 55 },
      { maxUnits: Infinity, charge: 55 },
    ],
    domesticDefaultFixedCharge: 30,
    electricityDutyPerUnit: 0.06,
    fppcaDefaultRatePerUnit: 0.15,
    commercialSlabs: [
      { min: 0, max: 50, rate: 6.9, label: "0 – 50 units" },
      { min: 51, max: 100, rate: 7.5, label: "51 – 100 units" },
      { min: 101, max: 300, rate: 8.5, label: "101 – 300 units" },
      { min: 301, max: 500, rate: 9.5, label: "301 – 500 units" },
      { min: 501, max: Infinity, rate: 10.5, label: "501+ units" },
    ],
    commercialCustomerCharge: 60,
    commercialDefaultFixedCharge: 150,
  },

  // Historical APERC Retail Supply Tariff Order for FY 2024-25
  "APERC-TO-2024-25": {
    version: "APERC-TO-2024-25",
    orderName: "APERC Retail Supply Tariff Order FY 2024–25",
    financialYear: "2024-25",
    effectiveFrom: "2024-04-01",
    effectiveTo: "2025-03-31",
    isOfficialGazetted: true,
    citation: "APERC Retail Supply Tariff Order FY 2024-25",
    discoms: ["APSPDCL", "APCPDCL", "APEPDCL"],
    domesticTelescopicSlabs: [
      { min: 0, max: 30, rate: 1.9, label: "0 – 30 units" },
      { min: 31, max: 75, rate: 3.0, label: "31 – 75 units" },
      { min: 76, max: 125, rate: 4.5, label: "76 – 125 units" },
      { min: 126, max: 225, rate: 6.0, label: "126 – 225 units" },
      { min: 226, max: 400, rate: 8.75, label: "226 – 400 units" },
      { min: 401, max: Infinity, rate: 9.75, label: "401+ units" },
    ],
    domesticCustomerCharges: [
      { maxUnits: 30, charge: 25 },
      { maxUnits: 75, charge: 30 },
      { maxUnits: 125, charge: 45 },
      { maxUnits: 225, charge: 50 },
      { maxUnits: 400, charge: 55 },
      { maxUnits: Infinity, charge: 55 },
    ],
    domesticDefaultFixedCharge: 30,
    electricityDutyPerUnit: 0.06,
    fppcaDefaultRatePerUnit: 0.15,
    commercialSlabs: [
      { min: 0, max: 50, rate: 6.9, label: "0 – 50 units" },
      { min: 51, max: 100, rate: 7.5, label: "51 – 100 units" },
      { min: 101, max: 300, rate: 8.5, label: "101 – 300 units" },
      { min: 301, max: 500, rate: 9.5, label: "301 – 500 units" },
      { min: 501, max: Infinity, rate: 10.5, label: "501+ units" },
    ],
    commercialCustomerCharge: 60,
    commercialDefaultFixedCharge: 150,
  },
};

/**
 * Trace and parse billing month into Indian Financial Year (FY: April 1 to March 31)
 */
export function parseFinancialYearFromBillingMonth(billingMonth?: string): {
  financialYear: string;
  year?: number;
  month?: number;
  isDateExtracted: boolean;
} {
  if (!billingMonth || typeof billingMonth !== "string") {
    return { financialYear: "2026-27", isDateExtracted: false };
  }

  const str = billingMonth.trim().toLowerCase();

  // Try extracting 4-digit year
  const yearMatch = str.match(/\b(20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

  // Month lookup table
  const monthMap: Record<string, number> = {
    jan: 1, january: 1, "01": 1, "1": 1,
    feb: 2, february: 2, "02": 2, "2": 2,
    mar: 3, march: 3, "03": 3, "3": 3,
    apr: 4, april: 4, "04": 4, "4": 4,
    may: 5, "05": 5, "5": 5,
    jun: 6, june: 6, "06": 6, "6": 6,
    jul: 7, july: 7, "07": 7, "7": 7,
    aug: 8, august: 8, "08": 8, "8": 8,
    sep: 9, sept: 9, september: 9, "09": 9, "9": 9,
    oct: 10, october: 10, "10": 10,
    nov: 11, november: 11, "11": 11,
    dec: 12, december: 12, "12": 12,
  };

  let foundMonth: number | undefined;
  for (const [key, num] of Object.entries(monthMap)) {
    // Word boundary or hyphen/slash delimited check
    const regex = new RegExp(`(^|[^a-z0-9])${key}([^a-z0-9]|$)`);
    if (regex.test(str)) {
      foundMonth = num;
      break;
    }
  }

  if (year && foundMonth) {
    // In India, Financial Year runs April to March:
    // If month >= 4: FY is year-(year+1) e.g., August 2026 -> FY 2026-27
    // If month < 4: FY is (year-1)-year e.g., Feb 2026 -> FY 2025-26
    const startYear = foundMonth >= 4 ? year : year - 1;
    const endShort = ((startYear + 1) % 100).toString().padStart(2, "0");
    const fyStr = `${startYear}-${endShort}`;
    return { financialYear: fyStr, year, month: foundMonth, isDateExtracted: true };
  } else if (year) {
    const endShort = ((year + 1) % 100).toString().padStart(2, "0");
    return { financialYear: `${year}-${endShort}`, year, isDateExtracted: false };
  }

  return { financialYear: "2026-27", isDateExtracted: false };
}

/**
 * Deterministically resolves the applicable APERC tariff schedule order
 */
export function resolveTariffSchedule(
  discom: APDiscom,
  category: APConsumerCategory,
  billingMonth?: string
): {
  schedule: TariffScheduleOrder;
  scheduleVersion: string;
  financialYear: string;
  isOfficialGazetted: boolean;
  status: "Verified Official" | "Provisional / Unverified Period";
  traceExplanation: string;
} {
  const { financialYear, isDateExtracted } = parseFinancialYearFromBillingMonth(billingMonth);
  const targetKey = `APERC-TO-${financialYear}`;

  if (TARIFF_SCHEDULE_REGISTRY[targetKey]) {
    const schedule = TARIFF_SCHEDULE_REGISTRY[targetKey];
    return {
      schedule,
      scheduleVersion: schedule.version,
      financialYear,
      isOfficialGazetted: schedule.isOfficialGazetted,
      status: isDateExtracted ? "Verified Official" : "Provisional / Unverified Period",
      traceExplanation: isDateExtracted
        ? `Selected official ${schedule.orderName} (FY ${financialYear}) for ${discom} based on extracted billing period '${billingMonth}'.`
        : `Selected ${schedule.orderName} (FY ${financialYear}) by fallback; billing date extraction was incomplete.`,
    };
  }

  // Fallback to latest verified schedule (FY 2026-27)
  const defaultSchedule = TARIFF_SCHEDULE_REGISTRY["APERC-TO-2026-27"];
  return {
    schedule: defaultSchedule,
    scheduleVersion: defaultSchedule.version,
    financialYear: "2026-27",
    isOfficialGazetted: false,
    status: "Provisional / Unverified Period",
    traceExplanation: `Requested FY ${financialYear} schedule not in registered gazette. Applied ${defaultSchedule.version} provisionally.`,
  };
}

export const DEFAULT_DISPUTE_THRESHOLD = 25; // Canonical dispute threshold in INR (₹25)

export type VarianceClassificationCategory =
  | "OVERCHARGE"
  | "UNDERCHARGE_OR_CREDIT"
  | "WITHIN_THRESHOLD"
  | "INVALID_OR_MISSING";

export interface VarianceClassification {
  variance: number; // actualBilledAmount - expectedAmount
  absoluteVariance: number; // Math.abs(variance)
  category: VarianceClassificationCategory;
  status: "Verified" | "Review Recommended" | "Potential Overcharge" | "Incomplete Audit";
  statusVariant: "green" | "orange" | "red";
  anomalyType: "Overcharged" | "Undercharged" | "Normal" | "Incomplete";
  threshold: number;
  isOvercharge: boolean;
  isUnderchargeOrCredit: boolean;
  isWithinThreshold: boolean;
  isInvalidOrMissing: boolean;
  summaryMessage: string;
}

export function classifyVariance(
  actualBilledAmount: number | undefined | null,
  expectedAmount: number | undefined | null,
  threshold: number = DEFAULT_DISPUTE_THRESHOLD,
  unitsConsumed?: number | undefined | null,
  meterMatch: boolean = true
): VarianceClassification {
  const actual = Number(actualBilledAmount);
  const expected = Number(expectedAmount);
  const units = unitsConsumed !== undefined && unitsConsumed !== null ? Number(unitsConsumed) : undefined;

  // 1. Missing or invalid amounts
  if (
    !Number.isFinite(actual) ||
    !Number.isFinite(expected) ||
    actual <= 0 ||
    expected <= 0 ||
    (units !== undefined && (!Number.isFinite(units) || units <= 0))
  ) {
    const rawVariance = Number.isFinite(actual) && Number.isFinite(expected) ? actual - expected : 0;
    return {
      variance: Math.round(rawVariance * 100) / 100,
      absoluteVariance: Math.abs(Math.round(rawVariance * 100) / 100),
      category: "INVALID_OR_MISSING",
      status: "Incomplete Audit",
      statusVariant: "orange",
      anomalyType: "Incomplete",
      threshold,
      isOvercharge: false,
      isUnderchargeOrCredit: false,
      isWithinThreshold: false,
      isInvalidOrMissing: true,
      summaryMessage: "Missing or invalid billing amounts; tariff verification cannot be performed.",
    };
  }

  const variance = Math.round((actual - expected) * 100) / 100;
  const absoluteVariance = Math.abs(variance);

  // 2. Overcharge: variance greater than threshold (default ₹25)
  if (variance > threshold) {
    return {
      variance,
      absoluteVariance,
      category: "OVERCHARGE",
      status: "Potential Overcharge",
      statusVariant: "red",
      anomalyType: "Overcharged",
      threshold,
      isOvercharge: true,
      isUnderchargeOrCredit: false,
      isWithinThreshold: false,
      isInvalidOrMissing: false,
      summaryMessage: `Actual statement exceeds statutory APERC calculation by ₹${variance.toLocaleString("en-IN")}. Potential overcharge detected beyond the ₹${threshold} threshold.`,
    };
  }

  // 3. Undercharge or unexpected credit: variance less than -threshold (default -₹25)
  if (variance < -threshold) {
    return {
      variance,
      absoluteVariance,
      category: "UNDERCHARGE_OR_CREDIT",
      status: "Review Recommended",
      statusVariant: "orange",
      anomalyType: "Undercharged",
      threshold,
      isOvercharge: false,
      isUnderchargeOrCredit: true,
      isWithinThreshold: false,
      isInvalidOrMissing: false,
      summaryMessage: `Actual bill is ₹${absoluteVariance.toLocaleString("en-IN")} substantially below the calculated APERC standard amount (₹${expected.toLocaleString("en-IN")}). This may indicate prompt payment rebates, government subsidies, solar net-metering credits, cycle adjustments, or an anomalous meter reading.`,
    };
  }

  // 4. Within threshold: absolute variance <= threshold (default ₹25)
  if (!meterMatch) {
    return {
      variance,
      absoluteVariance,
      category: "WITHIN_THRESHOLD",
      status: "Review Recommended",
      statusVariant: "orange",
      anomalyType: "Normal",
      threshold,
      isOvercharge: false,
      isUnderchargeOrCredit: false,
      isWithinThreshold: true,
      isInvalidOrMissing: false,
      summaryMessage: `Tariff calculation is within statutory tolerance of ₹${threshold} (variance: ₹${variance >= 0 ? "+" : ""}${variance}), but meter reading delta differs from billed consumption. Meter ledger verification advised.`,
    };
  }

  return {
    variance,
    absoluteVariance,
    category: "WITHIN_THRESHOLD",
    status: "Verified",
    statusVariant: "green",
    anomalyType: "Normal",
    threshold,
    isOvercharge: false,
    isUnderchargeOrCredit: false,
    isWithinThreshold: true,
    isInvalidOrMissing: false,
    summaryMessage: `Billed statement conforms to the APERC retail tariff order within statutory tolerance of ₹${threshold} (variance: ₹${variance >= 0 ? "+" : ""}${variance}).`,
  };
}

export interface APAuditResult {
  // Identification & Provenance
  auditReferenceId: string;
  auditCertificateId: string; // Alias retained for backwards compatibility
  timestamp: string;
  discom: APDiscom;
  discomFullName: string;
  consumerCategory: APConsumerCategory;
  billingMonth: string;
  financialYear: string;
  tariffScheduleVersion: string;
  tariffScheduleStatus: "Verified Official" | "Provisional / Unverified Period";
  tariffCitation: string;
  scheduleTraceExplanation: string;
  isDemo: boolean;

  // Meter Reading Verification
  unitsConsumed: number;
  meterDeltaUnits?: number;
  meterMatch: boolean;

  // Reconciled Monetary Values (2-decimal precision)
  expectedBill: number;
  actualBill: number;
  difference: number; // positive = overcharged, negative = undercharged
  percentageDifference: number;
  roundedPayableAmount?: number;
  roundingAdjustment?: number;

  // Status & Anomaly Flags
  status: "Verified" | "Review Recommended" | "Potential Overcharge" | "Incomplete Audit";
  statusVariant: "green" | "orange" | "red";
  anomalyType: "Overcharged" | "Undercharged" | "Normal" | "Incomplete";

  // Itemized Reconciled Breakdown
  slabs: APSlabCalculationItem[];
  totalEnergyCharges: number;
  customerCharges: number;
  fixedCharges: number;
  electricityDuty: number;
  fppcaFuelSurcharge: number;
  subtotal: number;

  // Audit Evidence & Disclaimers
  calculationFormula: string;
  highestSlabApplied: string;
  varianceExplanation: string;

  // Consumer Rights (Non-governmental, factual information)
  consumerRights: {
    regulations: string;
    timeline: string;
    eligibility: string;
  };

  // Reliability Assessment
  auditReliability: {
    level: "High" | "Medium" | "Low";
    reason: string;
  };

  // Raw inputs for transparency
  rawInputs: {
    unitsConsumed: number;
    actualBillAmount: number;
    billingMonth: string;
    fixedChargesProvided?: number;
    fuelChargesProvided?: number;
    taxesProvided?: number;
    meterReadPrevious?: number;
    meterReadCurrent?: number;
  };

  aiExplanationText: string;
  actionRecommendation: string;
}

/**
 * 100% Deterministic, Explainable, Zero-AI Tariff Calculation Engine
 */
export function calculateAPTariff(input: APAuditInput): APAuditResult {
  const units = Math.max(0, Number(input.unitsConsumed) || 0);
  const actualBill = Math.max(0, Number(input.actualBillAmount) || 0);
  const isDemo = Boolean(input.isDemo);

  const discomInfo =
    AP_DISCOMS.find((d) => d.id === input.discom) || AP_DISCOMS[0];

  // 1. Trace and select versioned tariff schedule
  const resolved = resolveTariffSchedule(
    input.discom,
    input.consumerCategory,
    input.billingMonth
  );
  const { schedule, scheduleVersion, financialYear, status: scheduleStatus, traceExplanation } = resolved;

  const rules =
    input.consumerCategory === "Commercial"
      ? schedule.commercialSlabs
      : schedule.domesticTelescopicSlabs;

  // 2. Telescopic Slab-wise Energy Charges Calculation
  let remainingUnits = units;
  let previousMax = 0;
  const slabs: APSlabCalculationItem[] = [];
  let totalEnergyCharges = 0;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const capacity = rule.max === Infinity ? Infinity : rule.max - previousMax;
    const unitsInThisSlab = Math.min(Math.max(0, remainingUnits), capacity);

    if (unitsInThisSlab > 0 || (i === 0 && units === 0)) {
      const cost = Math.round(unitsInThisSlab * rule.rate * 100) / 100;
      totalEnergyCharges = Math.round((totalEnergyCharges + cost) * 100) / 100;

      slabs.push({
        slabRange: rule.label,
        unitsInSlab: unitsInThisSlab,
        ratePerUnit: rule.rate,
        cost,
        percentageOfEnergy: 0,
      });

      remainingUnits -= unitsInThisSlab;
    }

    previousMax = rule.max;
    if (remainingUnits <= 0) break;
  }

  // Calculate percentage share of energy charges
  slabs.forEach((s) => {
    s.percentageOfEnergy =
      totalEnergyCharges > 0
        ? Math.round((s.cost / totalEnergyCharges) * 1000) / 10
        : 0;
  });

  // 3. Customer Meter Service Charges (Tiered by monthly consumption)
  let customerCharges = 0;
  if (input.consumerCategory === "Commercial") {
    customerCharges = schedule.commercialCustomerCharge;
  } else {
    for (const tier of schedule.domesticCustomerCharges) {
      if (units <= tier.maxUnits) {
        customerCharges = tier.charge;
        break;
      }
    }
  }

  // 4. Fixed Charges
  const fixedCharges =
    input.fixedCharges !== undefined && input.fixedCharges >= 0
      ? Math.round(Number(input.fixedCharges) * 100) / 100
      : input.consumerCategory === "Commercial"
      ? schedule.commercialDefaultFixedCharge
      : schedule.domesticDefaultFixedCharge;

  // 5. Electricity Duty (AP Electricity Duty Act: 6 paise per unit)
  const electricityDuty = Math.round(units * schedule.electricityDutyPerUnit * 100) / 100;

  // 6. FPPCA (Fuel & Power Purchase Cost Adjustment)
  // Use extracted bill value if supplied, otherwise use APERC approved quarterly rate
  const fppcaFuelSurcharge =
    input.fuelAdjustmentCharges !== undefined && input.fuelAdjustmentCharges >= 0
      ? Math.round(Number(input.fuelAdjustmentCharges) * 100) / 100
      : Math.round(units * schedule.fppcaDefaultRatePerUnit * 100) / 100;

  // 7. Deterministic Total Expected Bill Reconciliation
  const calculatedSum =
    Math.round(
      (totalEnergyCharges +
        customerCharges +
        fixedCharges +
        electricityDuty +
        fppcaFuelSurcharge) *
        100
    ) / 100;

  const expectedBill = calculatedSum;
  const subtotal = calculatedSum;

  // Statutory rounding under APERC Electricity Supply Code (rounded off to nearest rupee)
  const roundedPayableAmount = Math.round(expectedBill);
  const roundingAdjustment = Math.round((roundedPayableAmount - expectedBill) * 100) / 100;
  const isExactOrRoundingMatch = actualBill === expectedBill || actualBill === roundedPayableAmount;

  // 8. Comparison & Variance
  const difference = Math.round((actualBill - expectedBill) * 100) / 100;
  const percentageDifference =
    expectedBill > 0
      ? Math.round((Math.abs(difference) / expectedBill) * 1000) / 10
      : 0;

  // 9. Meter Reading Verification
  let meterDeltaUnits: number | undefined;
  let meterMatch = true;
  if (
    input.meterReadCurrent !== undefined &&
    input.meterReadPrevious !== undefined &&
    input.meterReadCurrent > 0 &&
    input.meterReadPrevious >= 0
  ) {
    meterDeltaUnits = input.meterReadCurrent - input.meterReadPrevious;
    if (Math.abs(meterDeltaUnits - units) > 2) {
      meterMatch = false;
    }
  }

  // 10. Canonical Anomaly Detection & Status
  const classification = classifyVariance(
    actualBill,
    expectedBill,
    DEFAULT_DISPUTE_THRESHOLD,
    units,
    meterMatch
  );
  const anomalyType = classification.anomalyType;
  const status = classification.status;
  const statusVariant = classification.statusVariant;

  // 11. Highest Slab Applied (Dynamically detected from slabs)
  let highestSlabApplied = rules[0].label;
  if (rules.length > 0) {
    for (let i = rules.length - 1; i >= 0; i--) {
      if (units > rules[i].min) {
        highestSlabApplied = `${rules[i].label} @ ₹${rules[i].rate.toFixed(2)}/u`;
        break;
      }
    }
  }

  // 12. Formula string matching exact rounded components
  const calculationFormula = `Energy Charges (₹${totalEnergyCharges.toFixed(2)}) + Fixed Charges (₹${fixedCharges.toFixed(2)}) + Customer Charges (₹${customerCharges.toFixed(2)}) + Electricity Duty (₹${electricityDuty.toFixed(2)}) + FPPCA (₹${fppcaFuelSurcharge.toFixed(2)}) = ₹${expectedBill.toFixed(2)}`;

  // 13. Fact-based Variance Explanation (Free of unsupported claims)
  const demoPrefix = isDemo ? "[DEMO SAMPLE BILL] " : "";
  let varianceExplanation = "";
  if (classification.isInvalidOrMissing) {
    varianceExplanation = `${demoPrefix}Missing or invalid billing amounts provided. Verification cannot be confirmed without valid units and billed amount.`;
  } else if (isExactOrRoundingMatch && actualBill !== expectedBill) {
    varianceExplanation = `${demoPrefix}Actual billed amount (₹${actualBill.toLocaleString("en-IN")}) matches the APERC expected payable bill after statutory nearest-rupee rounding (calculated ₹${expectedBill.toLocaleString("en-IN")} rounded to ₹${roundedPayableAmount.toLocaleString("en-IN")} per APERC Supply Code). Highest slab tier entered: ${highestSlabApplied}. Breakdown: Energy ₹${totalEnergyCharges.toFixed(2)}, Fixed ₹${fixedCharges.toFixed(2)}, Customer Charges ₹${customerCharges.toFixed(2)}, Duty ₹${electricityDuty.toFixed(2)}, FPPCA ₹${fppcaFuelSurcharge.toFixed(2)}. The ₹${Math.abs(difference).toFixed(2)} rounding adjustment conforms to utility billing terms.`;
  } else if (classification.isOvercharge) {
    varianceExplanation = `${demoPrefix}Actual billed amount (₹${actualBill.toLocaleString("en-IN")}) exceeds the APERC expected tariff (₹${expectedBill.toLocaleString("en-IN")}) by ₹${difference.toLocaleString("en-IN")} (+${percentageDifference}%). Highest slab tier entered: ${highestSlabApplied}. Breakdown: Energy ₹${totalEnergyCharges.toFixed(2)}, Fixed ₹${fixedCharges.toFixed(2)}, Customer Charges ₹${customerCharges.toFixed(2)}, Duty ₹${electricityDuty.toFixed(2)}, FPPCA ₹${fppcaFuelSurcharge.toFixed(2)}. This variance is not accounted for by the published APERC retail tariff order.`;
  } else if (classification.isUnderchargeOrCredit) {
    varianceExplanation = `${demoPrefix}Actual billed amount (₹${actualBill.toLocaleString("en-IN")}) is ₹${Math.abs(difference).toLocaleString("en-IN")} substantially below the standard APERC tariff calculation (₹${expectedBill.toLocaleString("en-IN")}). Highest slab tier entered: ${highestSlabApplied}. Breakdown: Energy ₹${totalEnergyCharges.toFixed(2)}, Fixed ₹${fixedCharges.toFixed(2)}, Customer Charges ₹${customerCharges.toFixed(2)}, Duty ₹${electricityDuty.toFixed(2)}, FPPCA ₹${fppcaFuelSurcharge.toFixed(2)}. This substantial variance may indicate prompt payment rebates, government subsidies, solar net-metering credits, cycle adjustments, or an anomalous meter reading.`;
  } else if (difference === 0) {
    varianceExplanation = `${demoPrefix}Actual billed amount (₹${actualBill.toLocaleString("en-IN")}) matches the APERC expected tariff (₹${expectedBill.toLocaleString("en-IN")}) exactly (0 variance).`;
  } else {
    varianceExplanation = `${demoPrefix}Actual billed amount (₹${actualBill.toLocaleString("en-IN")}) matches the APERC expected tariff (₹${expectedBill.toLocaleString("en-IN")}) within statutory tolerance (variance: ₹${difference >= 0 ? "+" : ""}${difference.toLocaleString("en-IN")}).`;
  }

  // 14. Non-governmental Consumer Rights Information
  const consumerRights = {
    regulations: "APERC Consumer Grievance Redressal Forum (CGRF) Regulations",
    timeline: "Grievance review schedules and hearings are determined by the respective DISCOM CGRF under forum guidelines.",
    eligibility: classification.isOvercharge
      ? `A billing variance of ₹${difference.toLocaleString("en-IN")} exceeds statutory APERC schedules and may be submitted as a formal billing inquiry to ${input.discom} customer care or local CGRF for meter reading and ledger verification.`
      : classification.isUnderchargeOrCredit
      ? `Actual statement is ₹${Math.abs(difference).toLocaleString("en-IN")} below standard calculation. You may request an itemized billing ledger clarification from ${input.discom} customer care.`
      : "Statement conforms to the APERC retail tariff order; no dispute filing indicated.",
  };

  // 15. Audit Reliability Assessment
  let reliabilityLevel: "High" | "Medium" | "Low" = "High";
  let reliabilityReason = `Calculation verified against published ${schedule.orderName} (FY ${financialYear}).`;

  if (units === 0 || actualBill === 0) {
    reliabilityLevel = "Low";
    reliabilityReason = "Incomplete billing fields provided. Verification cannot be confirmed without valid units and billed amount.";
  } else if (!meterMatch && meterDeltaUnits !== undefined) {
    reliabilityLevel = "Medium";
    reliabilityReason = `Meter reading delta (${meterDeltaUnits} units) differs from billed consumption (${units} units). Meter ledger verification advised.`;
  } else if (scheduleStatus === "Provisional / Unverified Period") {
    reliabilityLevel = "Medium";
    reliabilityReason = `Billing month was incomplete or unverified; tariff schedule (${scheduleVersion}) was applied provisionally.`;
  }

  const actionRecommendation =
    status === "Potential Overcharge" || status === "Review Recommended"
      ? `You may request an itemized billing clarification or ledger review from ${input.discom} citing APERC tariff schedule ${scheduleVersion}.`
      : `Your tariff calculation is verified against APERC rates. Maintaining consumption under 225 units avoids higher slab tiers.`;

  const refId = `BG-${input.discom}-${Date.now().toString(36).toUpperCase()}`;

  return {
    auditReferenceId: refId,
    auditCertificateId: refId, // Retained for backwards compatibility
    timestamp: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    discom: input.discom,
    discomFullName: discomInfo.name,
    consumerCategory: input.consumerCategory,
    billingMonth: input.billingMonth || "August 2026",
    financialYear,
    tariffScheduleVersion: scheduleVersion,
    tariffScheduleStatus: scheduleStatus,
    tariffCitation: schedule.citation,
    scheduleTraceExplanation: traceExplanation,
    isDemo,

    unitsConsumed: units,
    meterDeltaUnits,
    meterMatch,

    expectedBill,
    actualBill,
    difference,
    percentageDifference,
    roundedPayableAmount,
    roundingAdjustment,

    status,
    statusVariant,
    anomalyType,

    slabs,
    totalEnergyCharges,
    customerCharges,
    fixedCharges,
    electricityDuty,
    fppcaFuelSurcharge,
    subtotal,

    calculationFormula,
    highestSlabApplied,
    varianceExplanation,
    consumerRights,
    auditReliability: {
      level: reliabilityLevel,
      reason: reliabilityReason,
    },

    rawInputs: {
      unitsConsumed: units,
      actualBillAmount: actualBill,
      billingMonth: input.billingMonth || "",
      fixedChargesProvided: input.fixedCharges,
      fuelChargesProvided: input.fuelAdjustmentCharges,
      taxesProvided: input.taxes,
      meterReadPrevious: input.meterReadPrevious,
      meterReadCurrent: input.meterReadCurrent,
    },

    aiExplanationText: varianceExplanation,
    actionRecommendation,
  };
}
