export interface BillInput {
  state: string;
  consumerCategory: string;
  planId: string;
  unitsConsumed: number;
  billAmount: number;
  previousBillAmount: number;
  billingPeriodDays: number;
  meterReadPrevious: number;
  meterReadCurrent: number;
  consumerNumber: string;
  discomName: string;
}

export interface UserProfile {
  name: string;
  role: string;
  avatarLetter: string;
  consumerNumber: string;
  state: string;
  discom: string;
}

export const CURRENT_USER: UserProfile = {
  name: "Pream Pareesh",
  role: "Home Consumer",
  avatarLetter: "P",
  consumerNumber: "123456789",
  state: "Andhra Pradesh",
  discom: "APCPDCL / APSPDCL",
};

export const DEFAULT_BILL_INPUT: BillInput = {

  state: "Andhra Pradesh",
  consumerCategory: "Domestic",
  planId: "ap-domestic",
  unitsConsumed: 320,
  billAmount: 2850,
  previousBillAmount: 2410,
  billingPeriodDays: 30,
  meterReadPrevious: 14210,
  meterReadCurrent: 14530,
  consumerNumber: "123456789",
  discomName: "Nellore Division, APSPDCL",
};

export const MONTHLY_USAGE_TREND = [
  { month: "Apr", units: 180, amount: 1450, previousUnits: 175 },
  { month: "May", units: 220, amount: 1820, previousUnits: 200 },
  { month: "Jun", units: 270, amount: 2340, previousUnits: 250 },
  { month: "Jul", units: 271, amount: 2410, previousUnits: 260 },
  { month: "Aug", units: 320, amount: 2850, previousUnits: 271 },
  { month: "Sep", units: 295, amount: 2610, previousUnits: 280 },
  { month: "Oct", units: 310, amount: 2720, previousUnits: 290 },
];

export const USAGE_VS_NEIGHBORS = [
  { month: "Apr", yourUsage: 180, neighborsUsage: 195 },
  { month: "May", yourUsage: 220, neighborsUsage: 210 },
  { month: "Jun", yourUsage: 270, neighborsUsage: 230 },
  { month: "Jul", yourUsage: 271, neighborsUsage: 240 },
  { month: "Aug", yourUsage: 320, neighborsUsage: 255 },
  { month: "Sep", yourUsage: 295, neighborsUsage: 245 },
  { month: "Oct", yourUsage: 310, neighborsUsage: 250 },
];

export const HISTORICAL_BILLS = [
  {
    id: "OCT-2026",
    month: "October",
    year: 2026,
    discom: "APSPDCL",
    units: 310,
    amountBilled: 2720,
    expectedAmount: 2650,
    difference: 70,
    status: "Needs Review",
    statusVariant: "warning",
    billingPeriod: "01-10-2026 to 31-10-2026",
  },
  {
    id: "SEP-2026",
    month: "September",
    year: 2026,
    discom: "APSPDCL",
    units: 295,
    amountBilled: 2610,
    expectedAmount: 2610,
    difference: 0,
    status: "Verified",
    statusVariant: "success",
    billingPeriod: "01-09-2026 to 30-09-2026",
  },
  {
    id: "AUG-2026",
    month: "August",
    year: 2026,
    discom: "APSPDCL",
    units: 320,
    amountBilled: 2850,
    expectedAmount: 2740,
    difference: 110,
    status: "Needs Review",
    statusVariant: "warning",
    billingPeriod: "01-08-2026 to 31-08-2026",
  },
  {
    id: "JUL-2026",
    month: "July",
    year: 2026,
    discom: "APSPDCL",
    units: 271,
    amountBilled: 2410,
    expectedAmount: 2410,
    difference: 0,
    status: "Verified",
    statusVariant: "success",
    billingPeriod: "01-07-2026 to 31-07-2026",
  },
  {
    id: "JUN-2026",
    month: "June",
    year: 2026,
    discom: "APSPDCL",
    units: 270,
    amountBilled: 2340,
    expectedAmount: 2340,
    difference: 0,
    status: "Verified",
    statusVariant: "success",
    billingPeriod: "01-06-2026 to 30-06-2026",
  },
];

export const ENVIRONMENTAL_METRICS = {
  monthlyCo2Kg: 142,
  averageHouseholdCo2Kg: 98,
  efficientHouseholdCo2Kg: 65,
  treesEquivalentMonth: 6,
  annualSavingsPotential: 3600,
  coalAvoidedLbs: 312,
};
