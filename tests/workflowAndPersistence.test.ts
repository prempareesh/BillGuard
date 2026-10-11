import test from "node:test";
import assert from "node:assert";
import {
  calculateAPTariff,
} from "../src/lib/apTariffEngine.ts";

import {
  validateExtractedFields,
  EMPTY_EXTRACTED,
} from "../src/lib/validation.ts";
import type { ExtractedBillData } from "../src/lib/validation.ts";
import { aiService } from "../src/lib/aiService.ts";



test("Workflow, Field Correction, and Persistence Invariant Tests", async (t) => {
  await t.test("Field Validation classifies verified and missing fields accurately", () => {
    // Empty extracted data should flag critical fields as missing
    const emptyValidation = validateExtractedFields(EMPTY_EXTRACTED);
    assert.strictEqual(emptyValidation.consumerNumber, "Missing");
    assert.strictEqual(emptyValidation.units, "Missing");
    assert.strictEqual(emptyValidation.billAmount, "Missing");
    assert.strictEqual(emptyValidation.isNeedsReview, true);
    assert.strictEqual(emptyValidation.reliability, "Low");

    // Valid sample bill
    const validData: ExtractedBillData = {
      consumerName: "S. Venkateswara Rao",
      consumerNumber: "1429810342",
      serviceNumber: "NEL-04-12948",
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      billingMonth: "August 2026",
      unitsConsumed: 220,
      billAmount: 1450,
      fixedCharges: 30,
      taxes: 13.2,
      fuelAdjustmentCharges: 33,
      previousReading: 5000,
      currentReading: 5220,
      dueDate: "24-08-2026",
    };

    const validValidation = validateExtractedFields(validData);
    assert.strictEqual(validValidation.consumerNumber, "Verified");
    assert.strictEqual(validValidation.units, "Verified");
    assert.strictEqual(validValidation.billAmount, "Verified");
    assert.strictEqual(validValidation.isNeedsReview, false);
    assert.strictEqual(validValidation.reliability, "High");
  });

  await t.test("Meter delta discrepancy flags Needs Review", () => {
    const anomalousData: ExtractedBillData = {
      consumerName: "K. Raghunath Reddy",
      consumerNumber: "1429810342",
      serviceNumber: "NEL-04-12948",
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      billingMonth: "August 2026",
      unitsConsumed: 320, // 320 billed units
      billAmount: 2850,
      fixedCharges: 30,
      taxes: 19,
      fuelAdjustmentCharges: 48,
      previousReading: 14000,
      currentReading: 14100, // Delta is only 100 units! 100 != 320
      dueDate: "24-08-2026",
    };

    const validation = validateExtractedFields(anomalousData);
    assert.strictEqual(validation.units, "Needs Review");
    assert.strictEqual(validation.isNeedsReview, true);
  });

  await t.test("Consumer field correction recalculates deterministic APERC tariff without data contamination", () => {
    // 1. Initial uncertain calculation
    const initialUnits = 320;
    const initialActual = 2850;
    const initialAudit = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: initialUnits,
      actualBillAmount: initialActual,
      billingMonth: "August 2026",
    });

    assert.strictEqual(initialAudit.unitsConsumed, 320);
    assert.strictEqual(initialAudit.expectedBill, 2000.45);
    assert.strictEqual(initialAudit.status, "Potential Overcharge");

    // 2. Consumer corrects units to verified meter reading (200 units)
    const correctedUnits = 200;
    const correctedActual = 1350;
    const correctedAudit = calculateAPTariff({
      discom: "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: correctedUnits,
      actualBillAmount: correctedActual,
      billingMonth: "August 2026",
    });

    assert.strictEqual(correctedAudit.unitsConsumed, 200);
    // 200 units breakdown:
    // 0-30 @ 1.90 = 57
    // 31-75 @ 3.00 = 135
    // 76-125 @ 4.50 = 225
    // 126-200 (75 units) @ 6.00 = 450
    // Total energy: 867
    assert.strictEqual(correctedAudit.totalEnergyCharges, 867);
    assert.strictEqual(correctedAudit.expectedBill, 989);
    assert.ok(correctedAudit.difference > 0);
  });


  await t.test("Dispute letter generation derives facts strictly from selected audit record", () => {
    const auditRecord = {
      recipientTitle: "The Superintending Engineer / Grievance Officer",
      discomName: "APSPDCL",
      division: "Nellore Division",
      consumerName: "K. Raghunath Reddy",
      consumerNumber: "1429810342",
      billingPeriod: "August 2026",
      actualBill: 2850,
      expectedBill: 2000.45,
      difference: 849.55,
      units: 320,
      date: "11 Oct 2026",
    };

    const letter = aiService.generateComplaintLetter(auditRecord);
    assert.ok(letter.includes("1429810342"), "Letter must contain consumer account number");
    assert.ok(letter.includes("APSPDCL"), "Letter must contain DISCOM authority");
    assert.ok(letter.includes("2,850") || letter.includes("2850"), "Letter must reference actual billed amount");
    assert.ok(letter.includes("320"), "Letter must state consumption units");
    assert.ok(letter.includes("APERC"), "Letter must cite official APERC regulatory framework");
  });

  await t.test("Variance classification enforces ₹25 dispute threshold consistently", async () => {
    const { classifyVariance, DEFAULT_DISPUTE_THRESHOLD } = await import("../src/lib/apTariffEngine.ts");
    assert.strictEqual(DEFAULT_DISPUTE_THRESHOLD, 25, "Default threshold must be ₹25");

    // Case 1: Overcharge > ₹25
    const overcharge = classifyVariance(1000, 950, 25, 100);
    assert.strictEqual(overcharge.variance, 50);
    assert.strictEqual(overcharge.isOvercharge, true);
    assert.strictEqual(overcharge.status, "Potential Overcharge");
    assert.strictEqual(overcharge.statusVariant, "red");

    // Case 2: Screenshot Scenario: Expected ₹1,922.45, Actual ₹501.00 (Variance -₹1,421.45)
    // Must NEVER be verified or green!
    const screenshotCase = classifyVariance(501, 1922.45, 25, 300);
    assert.strictEqual(screenshotCase.variance, -1421.45);
    assert.strictEqual(screenshotCase.absoluteVariance, 1421.45);
    assert.strictEqual(screenshotCase.isOvercharge, false);
    assert.strictEqual(screenshotCase.isUnderchargeOrCredit, true);
    assert.strictEqual(screenshotCase.isWithinThreshold, false);
    assert.strictEqual(screenshotCase.status, "Review Recommended");
    assert.strictEqual(screenshotCase.statusVariant, "orange");
    assert.strictEqual(screenshotCase.anomalyType, "Undercharged");

    // Case 3: Within threshold (Positive minor difference <= ₹25)
    const withinPos = classifyVariance(536, 535.7, 25, 125);
    assert.strictEqual(withinPos.isWithinThreshold, true);
    assert.strictEqual(withinPos.status, "Verified");
    assert.strictEqual(withinPos.statusVariant, "green");

    // Case 4: Within threshold (Negative minor difference >= -₹25)
    const withinNeg = classifyVariance(520, 535.7, 25, 125);
    assert.strictEqual(withinNeg.variance, -15.7);
    assert.strictEqual(withinNeg.isWithinThreshold, true);
    assert.strictEqual(withinNeg.status, "Verified");
    assert.strictEqual(withinNeg.statusVariant, "green");

    // Case 5: Missing or invalid amounts
    const invalidAmt = classifyVariance(0, 500, 25, 100);
    assert.strictEqual(invalidAmt.isInvalidOrMissing, true);
    assert.strictEqual(invalidAmt.status, "Incomplete Audit");
    assert.strictEqual(invalidAmt.statusVariant, "orange");
  });

  await t.test("Complaint letter distinguishes undercharge clarification from overcharge dispute", () => {
    // Undercharge scenario (e.g. ₹501 actual vs ₹1,922.45 expected)
    const underchargeRecord = {
      recipientTitle: "The Superintending Engineer / Grievance Officer",
      discomName: "APSPDCL",
      division: "Tirupati Division",
      consumerName: "S. Venkat Rao",
      consumerNumber: "9876543210",
      billingPeriod: "September 2026",
      actualBill: 501,
      expectedBill: 1922.45,
      difference: -1421.45,
      units: 300,
      date: "11 Oct 2026",
    };

    const underchargeLetter = aiService.generateComplaintLetter(underchargeRecord);
    assert.ok(underchargeLetter.includes("Clarification"), "Letter must be a clarification request");
    assert.ok(!underchargeLetter.includes("excess charge of"), "Undercharge letter must not falsely accuse an excess charge");
    assert.ok(underchargeLetter.includes("1,421.45") || underchargeLetter.includes("1421.45"), "Must state variance magnitude");
    assert.ok(underchargeLetter.includes("rebates") || underchargeLetter.includes("subsidies"), "Must mention possible rebates/subsidies");
    assert.ok(underchargeLetter.includes("9876543210"), "Must contain verified consumer number");
  });

  await t.test("Audit deletion, empty state persistence, and non-resurrection regression test", async () => {
    // Mock localStorage & sessionStorage in node environment
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = String(v); },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
    };

    const sessionData: Record<string, string> = {};
    const mockSessionStorage = {
      getItem: (k: string) => sessionData[k] ?? null,
      setItem: (k: string, v: string) => { sessionData[k] = String(v); },
      removeItem: (k: string) => { delete sessionData[k]; },
      clear: () => { Object.keys(sessionData).forEach((k) => delete sessionData[k]); },
    };

    // Attach to global for mock testing
    const globalContext = globalThis as unknown as {
      localStorage: unknown;
      sessionStorage: unknown;
      window: unknown;
      fetch: typeof fetch;
    };
    globalContext.localStorage = mockLocalStorage;
    globalContext.sessionStorage = mockSessionStorage;
    globalContext.window = globalThis;

    // 1. Simulate initial saved record in local storage
    const testRecord = {
      id: "AUD-DEL-TEST-001",
      timestamp: "11 Oct 2026, 05:00 PM",
      consumerName: "RAJAVARAPU LAKSHMI",
      serviceNumber: "332250950",
      consumerNumber: "332250950",
      discom: "APSPDCL",
      billingMonth: "October 2026",
      unitsConsumed: 125,
      expectedAmount: 535.77,
      actualAmount: 536.0,
      difference: 0.23,
      status: "Verified",
    };
    mockLocalStorage.setItem("billguard_audit_history", JSON.stringify([testRecord]));
    mockSessionStorage.setItem(
      "billguard_active_audit",
      JSON.stringify({
        auditResult: {
          auditCertificateId: testRecord.id,
          expectedBill: 535.77,
          actualBill: 536.0,
          difference: 0.23,
          status: "Verified",
          unitsConsumed: 125,
        },
        activeAuditId: testRecord.id,
        pipelineStep: 5,
      })
    );

    // 2. Dynamic import of store modules to test behavior
    const { dbGetAudits, dbDeleteAudit } = await import("../src/lib/dynamoStore.ts");
    const { apiClient } = await import("../src/lib/apiClient.ts");

    // Mock apiClient to simulate DynamoDB being empty (all audits deleted)
    const originalGet = apiClient.getAuditsFromDynamo;
    const originalDel = apiClient.deleteAuditFromDynamo;

    let deleteWasCalled = false;
    let deletedIdParam = "";

    apiClient.deleteAuditFromDynamo = async (id: string) => {
      deleteWasCalled = true;
      deletedIdParam = id;
    };

    apiClient.getAuditsFromDynamo = async () => {
      // DynamoDB returns empty list (authoritative source has 0 records)
      return [];
    };

    try {
      // 3. Delete the record
      await dbDeleteAudit(testRecord.id);
      assert.strictEqual(deleteWasCalled, true, "Delete must call backend delete handler");
      assert.strictEqual(deletedIdParam, testRecord.id, "Correct auditId must be deleted");

      // Verify localStorage was updated and record was removed
      const remainingLocal = JSON.parse(mockLocalStorage.getItem("billguard_audit_history") || "[]");
      assert.strictEqual(remainingLocal.length, 0, "Record must be deleted from localStorage");

      // 4. Fetch audits again - must return empty array authoritatively and NOT revive stale record
      const fetched = await dbGetAudits();
      assert.strictEqual(fetched.length, 0, "dbGetAudits must return empty list when DynamoDB is empty");
      assert.strictEqual(mockLocalStorage.getItem("billguard_audit_history"), "[]");

      // 5. Verify Dashboard empty state evaluation
      const latestAudit: { unitsConsumed?: number } | null = null;
      const latestHistory = fetched.length > 0 ? fetched[0] : null;
      const unitsConsumed = Number(latestAudit ? latestAudit.unitsConsumed : latestHistory ? latestHistory.unitsConsumed : 0);
      const hasAuditedBill = (latestAudit !== null || latestHistory !== null || fetched.length > 0) && unitsConsumed > 0;

      assert.strictEqual(hasAuditedBill, false, "Dashboard must evaluate hasAuditedBill as false when all records are deleted");

    } finally {
      // Restore apiClient methods
      apiClient.getAuditsFromDynamo = originalGet;
      apiClient.deleteAuditFromDynamo = originalDel;
    }
  });

  await t.test("API client deleteAuditFromDynamo surfaces server failures", async () => {
    const { apiClient } = await import("../src/lib/apiClient.ts");
    const originalFetch = globalThis.fetch;

    const globalContext = globalThis as unknown as { fetch: typeof fetch };
    // Simulate 503 error from backend
    globalContext.fetch = (async () => ({
      ok: false,
      status: 503,
      json: async () => ({ detail: "Amazon DynamoDB unreachable" }),
    })) as unknown as typeof fetch;

    try {
      let threw = false;
      try {
        await apiClient.deleteAuditFromDynamo("AUD-FAIL-TEST");
      } catch (err: unknown) {
        threw = true;
        const msg = err instanceof Error ? err.message : String(err);
        assert.ok(msg.includes("Amazon DynamoDB unreachable") || msg.includes("503"));
      }
      assert.strictEqual(threw, true, "Failed delete must throw error instead of pretending to succeed");
    } finally {
      globalContext.fetch = originalFetch;
    }
  });
});

