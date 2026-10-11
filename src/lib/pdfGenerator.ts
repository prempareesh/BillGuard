import { jsPDF } from "jspdf";
import type { APAuditResult } from "./apTariffEngine.ts";




export interface PDFGenerationOptions {
  language?: "en" | "te" | "hi";
  returnBlob?: boolean;
}

// Localized strings for Multilingual PDF Export
const PDF_TRANSLATIONS = {
  en: {
    title: "BILLGUARD ENERGY AUDIT",
    subtitle: "Electricity Tariff Audit & Compliance Summary",
    verifiedOfficial: "Official APERC Verification",
    sampleBanner: "SAMPLE DEMONSTRATION AUDIT — NOT AN OFFICIAL UTILITY RECORD",
    summaryTitle: "TARIFF VERIFICATION SUMMARY",
    expectedBill: "Expected Bill (APERC Rates)",
    actualBill: "Actual Statement Billed",
    variance: "Audit Variance",
    status: "Audit Status",
    itemizedTitle: "Itemized APERC Slab Calculation",
    tierRange: "Slab Tier Range",
    units: "Units",
    rate: "Rate (Rs/Unit)",
    amount: "Energy Amount (Rs)",
    energyCharges: "Total Energy Charges",
    customerCharges: "Customer Meter Charges (APERC Tiered)",
    fixedCharges: "Fixed Service Charges (Connection Baseline)",
    duty: "Electricity Duty (6 paise/unit)",
    fppca: "FPPCA Fuel Surcharge",
    reconciledTotal: "Total Reconciled Expected Bill",
    reconciliationSummary: "AUDIT RECONCILIATION SUMMARY",
    disclaimer: "Disclaimer: BillGuard is an independent consumer audit application and is not an agency of the Government of Andhra Pradesh or APERC.",
  },
  te: {
    title: "బిల్ గార్డ్ విద్యుత్ బిల్లు ఆడిట్ నివేదిక (BILLGUARD)",
    subtitle: "ఆంధ్రప్రదేశ్ విద్యుత్ నియంత్రణ మండలి (APERC) టారిఫ్ పరిశీలన",
    verifiedOfficial: "అధికారిక APERC ధృవీకరణ",
    sampleBanner: "నమూనా ప్రదర్శన ఆడిట్ — అధికారిక డిస్కం రికార్డు కాదు",
    summaryTitle: "టారిఫ్ ధృవీకరణ సారాంశం",
    expectedBill: "నిబంధనల ప్రకారం రావాల్సిన మొత్తం (APERC)",
    actualBill: "బిల్లులో చూపిన మొత్తం",
    variance: "తేడా / వ్యత్యాసం",
    status: "ఆడిట్ స్థితి",
    itemizedTitle: "స్లాబుల వారీగా విద్యుత్ ఛార్జీల లెక్కింపు",
    tierRange: "స్లాబ్ శ్రేణి",
    units: "యూనిట్లు",
    rate: "ధర (రూ./యూనిట్)",
    amount: "మొత్తం (రూ.)",
    energyCharges: "మొత్తం విద్యుత్ వినియోగ ఛార్జీలు",
    customerCharges: "కస్టమర్ మీటర్ ఛార్జీలు (APERC నిర్దేశిత)",
    fixedCharges: "స్థిర సేవా ఛార్జీలు (కనెక్షన్ బేస్ లైన్)",
    duty: "విద్యుత్ పన్ను (యూనిట్‌కు 6 పైసలు)",
    fppca: "FPPCA ఇంధన సర్‌ఛార్జ్ సర్దుబాటు",
    reconciledTotal: "చెల్లించాల్సిన వాస్తవ మొత్తం",
    reconciliationSummary: "ఆడిట్ పరిశీలన వివరణ",
    disclaimer: "గమనిక: బిల్ గార్డ్ ఒక స్వతంత్ర వినియోగదారుల ఆడిట్ సాధనం. ఇది ఆంధ్రప్రదేశ్ ప్రభుత్వం లేదా APERC కి సంబంధించినది కాదు.",
  },
  hi: {
    title: "बिलगार्ड बिजली बिल ऑडिट रिपोर्ट (BILLGUARD)",
    subtitle: "आंध्र प्रदेश विद्युत नियामक आयोग (APERC) टैरिफ सत्यापन",
    verifiedOfficial: "आधिकारिक APERC सत्यापन",
    sampleBanner: "नमूना प्रदर्शन ऑडिट — आधिकारिक विद्युत वितरण निगम रिकॉर्ड नहीं",
    summaryTitle: "टैरिफ सत्यापन सारांश",
    expectedBill: "अपेक्षित बिल (APERC नियमानुसार)",
    actualBill: "वास्तविक बिल राशि",
    variance: "अंतर / विचलन",
    status: "ऑडिट स्थिति",
    itemizedTitle: "स्लैब-वार विद्युत प्रभार गणना",
    tierRange: "स्लैब श्रेणी",
    units: "यूनिट",
    rate: "दर (रु./यूनिट)",
    amount: "राशि (रु.)",
    energyCharges: "कुल ऊर्जा प्रभार",
    customerCharges: "मीटर उपभोक्ता प्रभार (APERC निर्धारित)",
    fixedCharges: "स्थिर सेवा प्रभार (कनेक्शन आधार)",
    duty: "विद्युत शुल्क (6 पैसे प्रति यूनिट)",
    fppca: "FPPCA ईंधन अधिभार समायोजन",
    reconciledTotal: "कुल देय अपेक्षित राशि",
    reconciliationSummary: "ऑडिट मिलान विवरण",
    disclaimer: "अस्वीकरण: बिलगार्ड एक स्वतंत्र उपभोक्ता ऑडिट प्लेटफ़ॉर्म है और यह आंध्र प्रदेश सरकार या APERC की आधिकारिक एजेंसी नहीं है।",
  },
};

/**
 * Helper to render vernacular Unicode text (Telugu / Hindi) cleanly.
 * In browser environments, uses HTML5 Canvas for native OpenType shaping of complex Indic scripts.
 * In headless Node.js environments (test runners), falls back to safe jsPDF text rendering.
 */
function renderMultilingualText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: {
    align?: "left" | "center" | "right";
    fontSize?: number;
    colorHex?: string;
    isBold?: boolean;
    maxWidth?: number;
  }
) {
  const fontSize = options?.fontSize || 10;
  const align = options?.align || "left";

  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const scale = 3; // 3x for crisp 300+ DPI PDF printing
        const fontName = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Telugu", "Gautami", "Noto Sans Devanagari", "Mangal", sans-serif';
        const fontStyle = options?.isBold ? `bold ${fontSize * scale}px ${fontName}` : `${fontSize * scale}px ${fontName}`;
        ctx.font = fontStyle;

        const metrics = ctx.measureText(text);
        const textWidth = Math.ceil(metrics.width);
        const textHeight = Math.ceil(fontSize * scale * 1.4);

        canvas.width = textWidth + 20;
        canvas.height = textHeight + 10;

        ctx.font = fontStyle;
        ctx.fillStyle = options?.colorHex || "#0F172A";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 10, canvas.height / 2);

        const imgData = canvas.toDataURL("image/png");
        const pdfWidth = (canvas.width / scale) * 0.352778; // px to mm at 72dpi
        const pdfHeight = (canvas.height / scale) * 0.352778;

        let renderX = x;
        if (align === "center") renderX = x - pdfWidth / 2;
        else if (align === "right") renderX = x - pdfWidth;

        doc.addImage(imgData, "PNG", renderX, y - pdfHeight / 2, pdfWidth, pdfHeight);
        return;
      }
    } catch {
      // Fall through to standard rendering
    }
  }

  // Headless Node.js or fallback: standard jsPDF font rendering
  doc.setFont("helvetica", options?.isBold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.text(text, x, y, { align });
}

export function generateAuditReportPDF(
  audit: APAuditResult,
  options?: PDFGenerationOptions
): jsPDF | Blob {
  const doc = new jsPDF();
  const lang = options?.language || "en";
  const tr = PDF_TRANSLATIONS[lang] || PDF_TRANSLATIONS.en;

  // Header Title
  renderMultilingualText(doc, tr.title, 105, 18, {
    align: "center",
    fontSize: 14,
    isBold: true,
    colorHex: "#0F172A",
  });

  renderMultilingualText(doc, tr.subtitle, 105, 25, {
    align: "center",
    fontSize: 10,
    isBold: true,
    colorHex: "#16A34A",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Schedule: ${audit.tariffScheduleVersion} (${audit.tariffScheduleStatus || "Official"}) • ${tr.verifiedOfficial}`,
    105,
    31,
    { align: "center" }
  );

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  let curY = 41;

  // Demo Banner if this is synthetic demonstration data
  if (audit.isDemo) {
    doc.setFillColor(254, 243, 199);
    doc.rect(14, curY - 3, 182, 8, "F");
    renderMultilingualText(doc, tr.sampleBanner, 105, curY + 1.5, {
      align: "center",
      fontSize: 8,
      isBold: true,
      colorHex: "#B45309",
    });
    curY += 12;
  }

  // Metadata Section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const refId = audit.auditReferenceId || audit.auditCertificateId || "BG-REF";
  doc.text(`Audit Reference: ${refId}`, 14, curY);
  doc.text(`Date: ${audit.timestamp}`, 196, curY, { align: "right" });
  curY += 6;

  doc.text(`DISCOM: ${audit.discom} (${audit.discomFullName})`, 14, curY);
  doc.text(`Billing Month: ${audit.billingMonth}`, 196, curY, { align: "right" });
  curY += 6;

  doc.text(`Category: ${audit.consumerCategory} (APERC LT-I Telescopic)`, 14, curY);
  doc.text(`Units Billed: ${audit.unitsConsumed} kWh`, 196, curY, { align: "right" });
  curY += 6;

  doc.line(14, curY, 196, curY);
  curY += 6;

  // Key Monetary Audit Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, curY, 182, 36, "F");
  doc.rect(14, curY, 182, 36, "S");

  renderMultilingualText(doc, tr.summaryTitle, 20, curY + 7, {
    fontSize: 9.5,
    isBold: true,
    colorHex: "#0F172A",
  });

  renderMultilingualText(doc, `${tr.expectedBill}: Rs. ${audit.expectedBill.toFixed(2)}`, 20, curY + 16, {
    fontSize: 9,
    isBold: true,
    colorHex: "#16A34A",
  });

  renderMultilingualText(doc, `${tr.actualBill}: Rs. ${audit.actualBill.toFixed(2)}`, 20, curY + 25, {
    fontSize: 9,
    isBold: true,
    colorHex: "#DC2626",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(245, 158, 11);
  doc.text(
    `Variance: ${audit.difference >= 0 ? "+" : "-"}Rs. ${Math.abs(audit.difference).toFixed(2)} (${audit.percentageDifference}%)`,
    115,
    curY + 16
  );

  doc.setTextColor(15, 23, 42);
  doc.text(`Status: ${audit.status.toUpperCase()}`, 115, curY + 25);
  curY += 44;

  // Tariff Slabs Itemized Table
  renderMultilingualText(doc, tr.itemizedTitle, 14, curY, {
    fontSize: 10,
    isBold: true,
    colorHex: "#0F172A",
  });
  curY += 8;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(tr.tierRange, 16, curY);
  doc.text(tr.units, 90, curY);
  doc.text(tr.rate, 125, curY);
  doc.text(tr.amount, 194, curY, { align: "right" });

  doc.line(14, curY + 2, 196, curY + 2);
  curY += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);

  audit.slabs.forEach((slab) => {
    doc.text(slab.slabRange, 16, curY);
    doc.text(`${slab.unitsInSlab} u`, 90, curY);
    doc.text(`Rs. ${slab.ratePerUnit.toFixed(2)}`, 125, curY);
    doc.text(`Rs. ${slab.cost.toFixed(2)}`, 194, curY, { align: "right" });
    curY += 6;
  });

  doc.setFont("helvetica", "bold");
  doc.text(tr.energyCharges, 16, curY);
  doc.text(`Rs. ${audit.totalEnergyCharges.toFixed(2)}`, 194, curY, { align: "right" });
  curY += 7;

  // Statutory & Other Charges
  doc.setFont("helvetica", "normal");
  doc.text(tr.customerCharges, 16, curY);
  doc.text(`Rs. ${audit.customerCharges.toFixed(2)}`, 194, curY, { align: "right" });
  curY += 6;

  doc.text(tr.fixedCharges, 16, curY);
  doc.text(`Rs. ${audit.fixedCharges.toFixed(2)}`, 194, curY, { align: "right" });
  curY += 6;

  doc.text(`${tr.duty} (${audit.unitsConsumed} u)`, 16, curY);
  doc.text(`Rs. ${audit.electricityDuty.toFixed(2)}`, 194, curY, { align: "right" });
  curY += 6;

  doc.text(tr.fppca, 16, curY);
  doc.text(`Rs. ${audit.fppcaFuelSurcharge.toFixed(2)}`, 194, curY, { align: "right" });
  curY += 7;

  doc.line(14, curY, 196, curY);
  curY += 6;

  doc.setFont("helvetica", "bold");
  doc.text(tr.reconciledTotal, 16, curY);
  doc.text(`Rs. ${audit.expectedBill.toFixed(2)}`, 194, curY, { align: "right" });
  curY += 12;

  // Explanation Section
  doc.setFillColor(241, 245, 249);
  doc.rect(14, curY, 182, 30, "F");
  renderMultilingualText(doc, tr.reconciliationSummary, 20, curY + 6, {
    fontSize: 8.5,
    isBold: true,
    colorHex: "#0F172A",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const explanation = audit.aiExplanationText || audit.varianceExplanation || "";
  const splitText = doc.splitTextToSize(explanation, 170);
  doc.text(splitText.slice(0, 4), 20, curY + 13);

  // Legal Disclaimer Footer
  renderMultilingualText(doc, tr.disclaimer, 105, 282, {
    align: "center",
    fontSize: 6.5,
    colorHex: "#94A3B8",
  });

  if (options?.returnBlob) {
    return doc.output("blob");
  }

  const filename = `BillGuard_Audit_Report_${audit.discom}_${audit.billingMonth.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
  return doc;
}

export function generateComplaintPDF(
  data: {
    consumerName: string;
    consumerNumber: string;
    serviceNumber: string;
    discom: string;
    billingMonth: string;
    units: number;
    actualBill: number;
    expectedBill: number;
    difference: number;
    letterBody: string;
  },
  options?: PDFGenerationOptions
): jsPDF | Blob {
  const doc = new jsPDF();
  const lang = options?.language || "en";

  const title =
    lang === "te"
      ? "వినియోగదారుల విద్యుత్ బిల్లు వివాద విజ్ఞాపన పత్రం (CGRF)"
      : lang === "hi"
      ? "उपभोक्ता बिजली बिल शिकायत अभ्यावेदन (CGRF)"
      : "CONSUMER BILLING GRIEVANCE REPRESENTATION";

  renderMultilingualText(doc, title, 105, 20, {
    align: "center",
    fontSize: 13,
    isBold: true,
    colorHex: "#0F172A",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Formal Billing Inquiry Notice under APERC Consumer Grievance Guidelines", 105, 27, {
    align: "center",
  });

  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const lines = doc.splitTextToSize(data.letterBody, 175);
  doc.text(lines, 16, 42);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Generated via BillGuard Platform • Non-governmental consumer inquiry draft based on APERC tariff comparison",
    105,
    284,
    { align: "center" }
  );

  if (options?.returnBlob) {
    return doc.output("blob");
  }

  doc.save(`Dispute_Letter_${data.discom}_${data.consumerNumber}.pdf`);
  return doc;
}
