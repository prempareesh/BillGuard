"use client";

import React, { useState } from "react";
import {
  Download,
  Copy,
  Mail,
  Check,
  AlertTriangle,
} from "lucide-react";
import { APAuditResult } from "@/lib/apTariffEngine";
import { ExtractedBillData } from "@/lib/auditStore";
import { generateComplaintPDF } from "@/lib/pdfGenerator";

interface ComplaintSectionProps {
  audit: APAuditResult;
  extracted: ExtractedBillData;
}

export const ComplaintSection: React.FC<ComplaintSectionProps> = ({
  audit,
  extracted,
}) => {
  const [copied, setCopied] = useState(false);

  const discomEmails: Record<string, string> = {
    APSPDCL: "customercare@apspdcl.in",
    APCPDCL: "grievances@apcpdcl.in",
    APEPDCL: "cmd@apepdcl.in",
  };

  const recipientEmail = discomEmails[audit.discom] || "customercare@apspdcl.in";

  const letterBody = `To
The Assistant Engineer / Grievance Redressal Officer
${audit.discom} (${audit.discomFullName})
Andhra Pradesh

Date: ${audit.timestamp}

Subject: Formal Billing Dispute Notice under APERC Consumer Regulations — Consumer No. ${extracted.consumerNumber}

Respected Sir/Madam,

I am writing to formally dispute the electricity bill for the period ${audit.billingMonth} issued for Service No. ${extracted.serviceNumber} (Consumer Account: ${extracted.consumerNumber}).

Upon conducting a verified audit in compliance with the APERC Retail Tariff Order for ${audit.consumerCategory} (LT-I/LT-II) connections, a significant billing variance was detected:

1. Billed Statement Amount: ₹ ${audit.actualBill.toLocaleString("en-IN")}
2. Approved APERC Tariff Amount: ₹ ${audit.expectedBill.toLocaleString("en-IN")}
3. Disputed Overcharge Amount: ₹ ${audit.difference.toLocaleString("en-IN")} (${audit.percentageDifference}% discrepancy)
4. Total Billed Units: ${audit.unitsConsumed} kWh

GROUNDS FOR DISPUTE:
The mathematical breakdown reveals an unexplained variance of ₹ ${audit.difference.toLocaleString("en-IN")} beyond approved slab energy rates, fixed service charges (₹${audit.fixedCharges}), statutory electricity duty (₹${audit.electricityDuty}), and FPPCA fuel adjustment charges (₹${audit.fppcaFuelSurcharge}).

I request your office to:
1. Re-examine the slab calculations applied on the meter readings (Prev: ${extracted.previousReading}, Curr: ${extracted.currentReading}).
2. Issue an amended revised bill in accordance with APERC tariff schedules.
3. Credit/adjust any unauthorized surcharges in the immediate subsequent billing cycle.

Thank you.

Yours faithfully,
${extracted.consumerName}
Consumer No: ${extracted.consumerNumber}
Service No: ${extracted.serviceNumber}
DISCOM: ${audit.discom}
Contact Phone: Provided on Statement
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = () => {
    generateComplaintPDF({
      consumerName: extracted.consumerName,
      consumerNumber: extracted.consumerNumber,
      serviceNumber: extracted.serviceNumber,
      discom: audit.discom,
      billingMonth: audit.billingMonth,
      units: audit.unitsConsumed,
      actualBill: audit.actualBill,
      expectedBill: audit.expectedBill,
      difference: audit.difference,
      letterBody,
    });
  };

  const handleEmailDraft = () => {
    const subject = encodeURIComponent(
      `Billing Dispute Notice: Consumer A/C ${extracted.consumerNumber} (${audit.discom})`
    );
    const body = encodeURIComponent(letterBody);
    window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-rose-200/90 shadow-xs space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              APERC Statutory Dispute Draft
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                ₹{audit.difference} Discrepancy
              </span>
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Ready-to-use complaint letter citing official APERC regulatory clauses and tariff schedules.
            </p>
          </div>
        </div>

        {/* 3 Action Buttons: Download PDF, Copy Letter, Email Draft */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Download PDF
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Letter
              </>
            )}
          </button>

          <button
            onClick={handleEmailDraft}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" /> Email to {audit.discom}
          </button>
        </div>
      </div>

      {/* Formatted Letter Preview Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-[#0F172A] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto select-all">
        {letterBody}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Official grievance email for {audit.discom}: <strong className="text-slate-900 font-mono">{recipientEmail}</strong></span>
        <span>Valid under APERC Consumer Grievance Guidelines</span>
      </div>
    </div>
  );
};
