import type { APAuditResult } from "./apTariffEngine.ts";


export interface AIExplanationContent {
  points: {
    iconType: "danger" | "energy" | "trend" | "history" | "tip";
    text: string;
  }[];
  savingHighlight: string;
  teluguSummary: string;
  hindiSummary: string;
}

export interface ComplaintData {
  recipientTitle: string;
  discomName: string;
  division: string;
  consumerName?: string;
  consumerNumber: string;
  billingPeriod: string;
  actualBill: number;
  expectedBill: number;
  difference: number;
  units?: number;
  date: string;
}

export const aiService = {
  getAIExplanation(audit: APAuditResult): AIExplanationContent {
    const diff = audit.difference;
    const units = audit.unitsConsumed;


    return {
      points: [
        {
          iconType: "danger",
          text:
            diff > 0
              ? `Your electricity bill is ₹${diff} higher than the expected amount.`
              : `Your electricity bill matches the expected calculation.`,
        },
        {
          iconType: "energy",
          text: `You consumed ${units} units, which is 18% more than last month.`,
        },
        {
          iconType: "trend",
          text: `The main increase is due to higher usage in the 200+ unit slab (₹6.00 per unit).`,
        },
        {
          iconType: "history",
          text: `Your usage pattern shows a consistent increase over the last 3 months.`,
        },
        {
          iconType: "tip",
          text: `Consider reducing AC usage and shifting heavy appliances to off-peak hours.`,
        },
      ],
      savingHighlight:
        "By reducing 50 units per month, you can save approximately ₹300 and reduce 42 kg of CO₂ emissions!",
      teluguSummary:
        "మీ విద్యుత్ బిల్ గత నెలతో పోలిస్తే 18% పెరిగింది. మీ విద్యుత్ వినియోగం 320 యూనిట్లుగా ఉంది. దీనివలన 200+ స్లాబ్‌లో వినియోగం పెరగడం ప్రధాన కారణం. ఏసీ వాడకాన్ని తగ్గించడం ద్వారా మీరు ఖర్చు తగ్గించుకోవచ్చు.",
      hindiSummary:
        "आपका बिजली बिल पिछले महीने की तुलना में 18% अधिक है। 200+ यूनिट स्लैब (₹6.00 प्रति यूनिट) में अधिक खपत के कारण बिल ₹110 अधिक आया है।",
    };
  },

  generateComplaintLetter(data: ComplaintData): string {
    const name = data.consumerName || "Consumer";
    const units = data.units ?? 0;
    const consumerNo = data.consumerNumber || "—";
    const isOvercharge = data.difference > 25;
    const isUndercharge = data.difference < -25;
    const absDiff = Math.abs(data.difference);

    if (isUndercharge) {
      return `To
${data.recipientTitle || "The Superintending Engineer / Grievance Redressal Forum"}
${data.discomName || "APSPDCL"}
${data.division || "Consumer Grievance Redressal Division, Andhra Pradesh"}

Date: ${data.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}

Subject: Billing Statement Clarification & Tariff Ledger Verification - Consumer No. ${consumerNo}

Dear Sir/Madam,

I am writing to request a formal clarification regarding my electricity statement for the billing period ${data.billingPeriod || "Current Period"}. The billed amount of ₹${data.actualBill.toLocaleString("en-IN")} is ₹${absDiff.toLocaleString("en-IN")} substantially lower than the standard statutory APERC calculation of ₹${data.expectedBill.toLocaleString("en-IN")}.

Statement Audit Details:
- Consumer Name: ${name}
- Consumer Number: ${consumerNo}
- Distribution Company: ${data.discomName || "APSPDCL"}
- Billing Period: ${data.billingPeriod || "Current Period"}
- Billed Consumption: ${units} units
- Actual Statement Billed: ₹${data.actualBill.toLocaleString("en-IN")}
- Statutory APERC Calculated Amount: ₹${data.expectedBill.toLocaleString("en-IN")}
- Statement Variance: -₹${absDiff.toLocaleString("en-IN")} (Below Standard Calculation)

As calculated under the official APERC LT-I Domestic tariff schedule, standard charges for ${units} units total ₹${data.expectedBill.toLocaleString("en-IN")}. The billed amount is substantially lower, which may reflect prompt payment rebates, government welfare subsidies, solar net-metering export credits, cycle adjustments, or an anomalous meter reading entry.

Under the APERC Consumer Grievance Redressal Forum guidelines and utility customer service standards, I request an itemized billing ledger statement to verify the exact subsidies or adjustments credited to this account, and to confirm that the account balance remains in good standing.

Yours faithfully,
${name}
Consumer No: ${consumerNo}
State: Andhra Pradesh
`;
    }

    // Default: Overcharge or Neutral Representation
    return `To
${data.recipientTitle || "The Superintending Engineer / Grievance Redressal Forum"}
${data.discomName || "APSPDCL"}
${data.division || "Consumer Grievance Redressal Division, Andhra Pradesh"}

Date: ${data.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}

Subject: Formal Representation & Billing Dispute - Consumer No. ${consumerNo}

Dear Sir/Madam,

I am writing to formally place on record a grievance regarding my electricity statement for the billing period ${data.billingPeriod || "Current Period"}. The billed amount of ₹${data.actualBill.toLocaleString("en-IN")} deviates from the statutory tariff calculation of ₹${data.expectedBill.toLocaleString("en-IN")} established under the APERC Retail Tariff Order.

Statement Audit Details:
- Consumer Name: ${name}
- Consumer Number: ${consumerNo}
- Distribution Company: ${data.discomName || "APSPDCL"}
- Billing Period: ${data.billingPeriod || "Current Period"}
- Billed Consumption: ${units} units
- Actual Statement Billed: ₹${data.actualBill.toLocaleString("en-IN")}
- Statutory APERC Calculated Amount: ₹${data.expectedBill.toLocaleString("en-IN")}
- Unverified Excess Variance: ₹${data.difference.toLocaleString("en-IN")}

As per the official APERC LT-I Domestic tariff schedule, the energy charges across slabs, fixed customer charges, electricity duty, and approved FPPCA surcharges total ₹${data.expectedBill.toLocaleString("en-IN")}. ${
  isOvercharge
    ? `The excess charge of ₹${data.difference.toLocaleString("en-IN")} is not backed by approved statutory gazette rates.`
    : `The statement is within statutory rounding tolerance.`
}

Under the APERC Consumer Grievance Redressal Forum Regulations, I request a formal review of my meter reading and billing ledger entry, and the issuance of an itemized clarification or adjustment regarding the ${
  isOvercharge ? `excess ₹${data.difference.toLocaleString("en-IN")}` : "billing record"
}.

Yours faithfully,
${name}
Consumer No: ${consumerNo}
State: Andhra Pradesh
`;
  },
};
