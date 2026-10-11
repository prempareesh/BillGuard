import test from "node:test";
import assert from "node:assert";
import {
  calculateAPTariff,
  resolveTariffSchedule,
  parseFinancialYearFromBillingMonth,
  TARIFF_SCHEDULE_REGISTRY,
} from "../src/lib/apTariffEngine.ts";

test("Tariff Schedule Resolution & FY Tracing", async (t) => {
  await t.test("August 2026 resolves to FY 2026-27 and APERC-TO-2026-27", () => {
    assert.ok(TARIFF_SCHEDULE_REGISTRY["APERC-TO-2026-27"], "Registry must contain APERC-TO-2026-27 schedule");
    const fyInfo = parseFinancialYearFromBillingMonth("August 2026");
    assert.strictEqual(fyInfo.financialYear, "2026-27");
    assert.strictEqual(fyInfo.isDateExtracted, true);

    const resolved = resolveTariffSchedule("APSPDCL", "Domestic", "August 2026");
    assert.strictEqual(resolved.scheduleVersion, "APERC-TO-2026-27");
    assert.strictEqual(resolved.financialYear, "2026-27");
    assert.strictEqual(resolved.status, "Verified Official");
  });


  await t.test("February 2026 resolves to FY 2025-26 (Indian FY April-March rule)", () => {
    const fyInfo = parseFinancialYearFromBillingMonth("February 2026");
    assert.strictEqual(fyInfo.financialYear, "2025-26");
    assert.strictEqual(fyInfo.isDateExtracted, true);
  });

  await t.test("August 2024 resolves to FY 2024-25 and APERC-TO-2024-25", () => {
    const resolved = resolveTariffSchedule("APSPDCL", "Domestic", "August 2024");
    assert.strictEqual(resolved.scheduleVersion, "APERC-TO-2024-25");
    assert.strictEqual(resolved.status, "Verified Official");
  });

  await t.test("Unrecognized billing date flags uncertainty and applies latest schedule provisionally", () => {
    const resolved = resolveTariffSchedule("APSPDCL", "Domestic", "");
    assert.strictEqual(resolved.scheduleVersion, "APERC-TO-2026-27");
    assert.strictEqual(resolved.status, "Provisional / Unverified Period");
  });
});

test("APERC LT-I Domestic Telescopic Boundary Unit Tests (FY 2026-27)", async (t) => {
  // Test case 1: 0 units
  await t.test("0 units: baseline connection fees only", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 0,
      actualBillAmount: 55,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 0);
    assert.strictEqual(result.customerCharges, 25);
    assert.strictEqual(result.fixedCharges, 30);
    assert.strictEqual(result.electricityDuty, 0);
    assert.strictEqual(result.fppcaFuelSurcharge, 0);
    assert.strictEqual(result.expectedBill, 55);
    assert.strictEqual(result.status, "Incomplete Audit"); // 0 units is flagged as incomplete
  });

  // Test case 2: 30 units (Boundary of 0–30 @ ₹1.90)
  await t.test("30 units: upper boundary of slab 1 (0–30)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 30,
      actualBillAmount: 118.3,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 57.0); // 30 * 1.90
    assert.strictEqual(result.customerCharges, 25.0); // Tier 0-30
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 1.8); // 30 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 4.5); // 30 * 0.15
    assert.strictEqual(result.expectedBill, 118.3);
    assert.strictEqual(result.difference, 0.0);
    assert.strictEqual(result.status, "Verified");
  });

  // Test case 3: 31 units (First unit into slab 2: 31–75 @ ₹3.00)
  await t.test("31 units: step into slab 2 (31–75)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 31,
      actualBillAmount: 126.51,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 60.0); // 57 + 1*3.00
    assert.strictEqual(result.customerCharges, 30.0); // Tier 31-75
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 1.86); // 31 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 4.65); // 31 * 0.15
    assert.strictEqual(result.expectedBill, 126.51);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 4: 75 units (Upper boundary of slab 2: 31–75 @ ₹3.00)
  await t.test("75 units: upper boundary of slab 2 (31–75)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 75,
      actualBillAmount: 267.75,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 192.0); // 57 + 45*3.00 (135)
    assert.strictEqual(result.customerCharges, 30.0);
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 4.5); // 75 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 11.25); // 75 * 0.15
    assert.strictEqual(result.expectedBill, 267.75);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 5: 76 units (First unit into slab 3: 76–125 @ ₹4.50)
  await t.test("76 units: step into slab 3 (76–125)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 76,
      actualBillAmount: 287.46,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 196.5); // 192 + 1*4.50
    assert.strictEqual(result.customerCharges, 45.0); // Tier 76-125
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 4.56); // 76 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 11.4); // 76 * 0.15
    assert.strictEqual(result.expectedBill, 287.46);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 6: 125 units (Upper boundary of slab 3: 76–125 @ ₹4.50)
  await t.test("125 units: upper boundary of slab 3 (76–125)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 125,
      actualBillAmount: 518.25,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 417.0); // 192 + 50*4.50 (225)
    assert.strictEqual(result.customerCharges, 45.0);
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 7.5); // 125 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 18.75); // 125 * 0.15
    assert.strictEqual(result.expectedBill, 518.25);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 7: 126 units (First unit into slab 4: 126–225 @ ₹6.00)
  await t.test("126 units: step into slab 4 (126–225)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 126,
      actualBillAmount: 529.46,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 423.0); // 417 + 1*6.00
    assert.strictEqual(result.customerCharges, 50.0); // Tier 126-225
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 7.56); // 126 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 18.9); // 126 * 0.15
    assert.strictEqual(result.expectedBill, 529.46);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 8: 225 units (Upper boundary of slab 4: 126–225 @ ₹6.00)
  await t.test("225 units: upper boundary of slab 4 (126–225)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 225,
      actualBillAmount: 1144.25,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 1017.0); // 417 + 100*6.00 (600)
    assert.strictEqual(result.customerCharges, 50.0);
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 13.5); // 225 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 33.75); // 225 * 0.15
    assert.strictEqual(result.expectedBill, 1144.25);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 9: 226 units (First unit into slab 5: 226–400 @ ₹8.75)
  await t.test("226 units: step into slab 5 (226–400 @ ₹8.75)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 226,
      actualBillAmount: 1158.21,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 1025.75); // 1017 + 1*8.75
    assert.strictEqual(result.customerCharges, 55.0); // Tier 226-400
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 13.56); // 226 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 33.9); // 226 * 0.15
    assert.strictEqual(result.expectedBill, 1158.21);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 10: 400 units (Upper boundary of slab 5: 226–400 @ ₹8.75)
  await t.test("400 units: upper boundary of slab 5 (226–400)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 400,
      actualBillAmount: 2717.25,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 2548.25); // 1017 + 175*8.75 (1531.25)
    assert.strictEqual(result.customerCharges, 55.0);
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 24.0); // 400 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 60.0); // 400 * 0.15
    assert.strictEqual(result.expectedBill, 2717.25);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 11: 401 units (First unit into slab 6: 401+ @ ₹9.75)
  await t.test("401 units: step into slab 6 (401+ @ ₹9.75)", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 401,
      actualBillAmount: 2727.21,
      billingMonth: "August 2026",
    });

    assert.strictEqual(result.totalEnergyCharges, 2558.0); // 2548.25 + 1*9.75 (9.75)
    assert.strictEqual(result.customerCharges, 55.0);
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 24.06); // 401 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 60.15); // 401 * 0.15
    assert.strictEqual(result.expectedBill, 2727.21);
    assert.strictEqual(result.difference, 0.0);
  });

  // Test case 12: Actual 320-unit bill example
  await t.test("Actual 320-unit bill example with extracted parameters", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 320,
      actualBillAmount: 2850.0,
      billingMonth: "August 2026",
      fixedCharges: 30.0,
      fuelAdjustmentCharges: 48.0,
      taxes: 19.0,
      meterReadPrevious: 14210,
      meterReadCurrent: 14530,
      isDemo: true,
    });

    // 225 units = 1017.00, remaining 95 units @ 8.75 = 831.25 -> 1848.25
    assert.strictEqual(result.totalEnergyCharges, 1848.25);
    assert.strictEqual(result.customerCharges, 55.0);
    assert.strictEqual(result.fixedCharges, 30.0);
    assert.strictEqual(result.electricityDuty, 19.2); // 320 * 0.06
    assert.strictEqual(result.fppcaFuelSurcharge, 48.0); // user provided
    assert.strictEqual(result.expectedBill, 2000.45);
    assert.strictEqual(result.actualBill, 2850.0);
    assert.strictEqual(result.difference, 849.55);
    assert.strictEqual(result.percentageDifference, 42.5);
    assert.strictEqual(result.status, "Potential Overcharge");
    assert.strictEqual(result.isDemo, true);
  });

  // Test case 13: 125 units with ₹535.70 calculated vs ₹536.00 actual statement (statutory nearest-rupee rounding)
  await t.test("125 units: ₹535.70 calculated vs ₹536.00 actual bill evaluates to Verified under APERC rounding rule", () => {
    const result = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: 125,
      actualBillAmount: 536.0,
      billingMonth: "October 2026",
      fixedCharges: 10.0,
      fuelAdjustmentCharges: 56.2,
      taxes: 7.5,
    });

    assert.strictEqual(result.totalEnergyCharges, 417.0);
    assert.strictEqual(result.customerCharges, 45.0);
    assert.strictEqual(result.fixedCharges, 10.0);
    assert.strictEqual(result.electricityDuty, 7.5);
    assert.strictEqual(result.fppcaFuelSurcharge, 56.2);
    assert.strictEqual(result.expectedBill, 535.7);
    assert.strictEqual(result.actualBill, 536.0);
    assert.strictEqual(result.difference, 0.3);
    assert.strictEqual(result.roundedPayableAmount, 536.0);
    assert.strictEqual(result.roundingAdjustment, 0.3);
    // Must be classified as Verified and green under statutory rounding, NOT an overcharge!
    assert.strictEqual(result.status, "Verified");
    assert.strictEqual(result.statusVariant, "green");
    assert.strictEqual(result.anomalyType, "Normal");
    assert.strictEqual(result.consumerRights.eligibility.includes("no dispute filing indicated"), true);
  });
});

test("Reconciliation and Rounding Invariants", () => {
  const unitsToTest = [0, 30, 31, 75, 76, 125, 126, 225, 226, 320, 400, 401];

  for (const units of unitsToTest) {
    const res = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: units,
      actualBillAmount: 1500,
      billingMonth: "August 2026",
    });

    const sumComponents =
      Math.round(
        (res.totalEnergyCharges +
          res.customerCharges +
          res.fixedCharges +
          res.electricityDuty +
          res.fppcaFuelSurcharge) *
          100
      ) / 100;

    assert.strictEqual(
      res.expectedBill,
      sumComponents,
      `Expected bill must equal exact sum of components for units=${units}`
    );
    assert.strictEqual(
      res.subtotal,
      res.expectedBill,
      `Subtotal must match expected bill for units=${units}`
    );
    assert.strictEqual(
      res.difference,
      Math.round((1500 - res.expectedBill) * 100) / 100,
      `Difference must equal actual - expected for units=${units}`
    );
  }
});

test("Absence of Unsupported Claims and Demarcation of Demo Data", () => {
  const res = calculateAPTariff({
    discom: "APSPDCL",
    consumerCategory: "Domestic",
    unitsConsumed: 320,
    actualBillAmount: 2850,
    billingMonth: "August 2026",
    isDemo: true,
  });

  const fullText = JSON.stringify(res);

  // Must not claim government certification
  assert.strictEqual(fullText.includes("GOVERNMENT OF ANDHRA PRADESH"), false);

  // Must not claim guaranteed dispute eligibility or fixed 15-day resolution
  assert.strictEqual(fullText.includes("15 working days statutory resolution"), false);
  assert.strictEqual(fullText.includes("automatic disconnection"), false);
  assert.strictEqual(fullText.includes("escrow"), false);

  // Must mark demo data
  assert.strictEqual(res.isDemo, true);
  assert.strictEqual(res.varianceExplanation.includes("[DEMO SAMPLE BILL]"), true);
});
