import test from "node:test";
import assert from "node:assert";
import { generateAuditReportPDF, generateComplaintPDF } from "../src/lib/pdfGenerator.ts";
import { calculateAPTariff } from "../src/lib/apTariffEngine.ts";

test("Multilingual PDF Generation Suite (English, Telugu, Hindi)", async (t) => {
  const sampleAudit = calculateAPTariff({
    discom: "APSPDCL",
    consumerCategory: "Domestic",
    unitsConsumed: 250,
    actualBillAmount: 1850,
    billingMonth: "August 2026",
    isDemo: true,
  });

  await t.test("Generates valid English Audit Report PDF", () => {
    const pdfBlob = generateAuditReportPDF(sampleAudit, {
      language: "en",
      returnBlob: true,
    }) as Blob;

    assert.ok(pdfBlob, "PDF output must be generated");
    assert.ok(pdfBlob.size > 1000, `PDF size should be substantial (actual: ${pdfBlob.size} bytes)`);
  });

  await t.test("Generates valid Telugu (తెలుగు) Audit Report PDF", () => {
    const pdfBlob = generateAuditReportPDF(sampleAudit, {
      language: "te",
      returnBlob: true,
    }) as Blob;

    assert.ok(pdfBlob, "Telugu PDF output must be generated");
    assert.ok(pdfBlob.size > 1000, `Telugu PDF size should be substantial (actual: ${pdfBlob.size} bytes)`);
  });

  await t.test("Generates valid Hindi (हिंदी) Audit Report PDF", () => {
    const pdfBlob = generateAuditReportPDF(sampleAudit, {
      language: "hi",
      returnBlob: true,
    }) as Blob;

    assert.ok(pdfBlob, "Hindi PDF output must be generated");
    assert.ok(pdfBlob.size > 1000, `Hindi PDF size should be substantial (actual: ${pdfBlob.size} bytes)`);
  });

  await t.test("Generates valid Multilingual Consumer Dispute Letter PDF", () => {
    const complaintData = {
      consumerName: "K. Raghunath Reddy",
      consumerNumber: "1429810342",
      serviceNumber: "NEL-04-12948",
      discom: "APSPDCL",
      billingMonth: "August 2026",
      units: 250,
      actualBill: 1850,
      expectedBill: 1618.5,
      difference: 231.5,
      letterBody: "To The Grievance Officer, APSPDCL. Formal inquiry regarding billing variance under APERC regulations.",
    };

    const enComplaint = generateComplaintPDF(complaintData, { language: "en", returnBlob: true }) as Blob;
    assert.ok(enComplaint.size > 500, "English complaint PDF must be generated");

    const teComplaint = generateComplaintPDF(complaintData, { language: "te", returnBlob: true }) as Blob;
    assert.ok(teComplaint.size > 500, "Telugu complaint PDF must be generated");

    const hiComplaint = generateComplaintPDF(complaintData, { language: "hi", returnBlob: true }) as Blob;
    assert.ok(hiComplaint.size > 500, "Hindi complaint PDF must be generated");
  });
});
