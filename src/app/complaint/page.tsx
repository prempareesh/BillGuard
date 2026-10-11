"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Mail,
  Copy,
  Check,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import { useAppTranslation } from "@/lib/i18n";
import { aiService, ComplaintData } from "@/lib/aiService";
import { generateComplaintPDF } from "@/lib/pdfGenerator";
import { useAuditStore } from "@/lib/auditStore";
import { APDiscom, classifyVariance, DEFAULT_DISPUTE_THRESHOLD } from "@/lib/apTariffEngine";

function ComplaintContent() {
  const searchParams = useSearchParams();
  const { auditResult, extractedData, historyList, activeLanguage } = useAuditStore();

  const { t } = useAppTranslation();

  const auditIdParam = searchParams.get("auditId");
  const actualParam = searchParams.get("actual");
  const expectedParam = searchParams.get("expected");
  const diffParam = searchParams.get("diff");
  const unitsParam = searchParams.get("units");

  const [copied, setCopied] = useState(false);
  const [editedLetterText, setEditedLetterText] = useState<string | null>(null);

  // Strictly check if an audit was explicitly selected from history
  const selectedHistoryRecord = auditIdParam
    ? historyList.find((h) => h.id === auditIdParam)
    : null;

  // Resolve values strictly from: explicitly selected history record -> active session auditResult -> explicit query params
  let actualBill = 0;
  let expectedBill = 0;
  let difference = 0;
  let units = 0;
  let discom: APDiscom = "APSPDCL";
  let consumerNumber = "";
  let consumerName = "";
  let serviceNumber = "";
  let billingPeriod = "";
  let hasAuditRecord = false;

  if (selectedHistoryRecord) {
    actualBill = Number(selectedHistoryRecord.actualAmount ?? selectedHistoryRecord.actualBill ?? 0);
    expectedBill = Number(selectedHistoryRecord.expectedAmount ?? selectedHistoryRecord.expectedBill ?? 0);
    difference = Number(selectedHistoryRecord.difference ?? (actualBill - expectedBill));
    units = Number(selectedHistoryRecord.unitsConsumed ?? selectedHistoryRecord.units ?? 0);
    discom = selectedHistoryRecord.discom || "APSPDCL";
    consumerNumber = selectedHistoryRecord.consumerNumber || "—";
    consumerName = selectedHistoryRecord.consumerName || "Consumer";
    serviceNumber = selectedHistoryRecord.serviceNumber || "—";
    billingPeriod = selectedHistoryRecord.billingMonth || "Current Cycle";
    hasAuditRecord = true;
  } else if (auditResult) {
    actualBill = auditResult.actualBill;
    expectedBill = auditResult.expectedBill;
    difference = auditResult.difference;
    units = auditResult.unitsConsumed;
    discom = auditResult.discom;
    consumerNumber = extractedData?.consumerNumber || "—";
    consumerName = extractedData?.consumerName || "Consumer";
    serviceNumber = extractedData?.serviceNumber || "—";
    billingPeriod = auditResult.billingMonth || "Current Cycle";
    hasAuditRecord = true;
  } else if (actualParam && expectedParam) {
    actualBill = parseFloat(actualParam) || 0;
    expectedBill = parseFloat(expectedParam) || 0;
    difference = diffParam ? parseFloat(diffParam) : (actualBill - expectedBill);
    units = unitsParam ? parseFloat(unitsParam) : 0;
    discom = (searchParams.get("discom") as APDiscom) || "APSPDCL";
    consumerNumber = searchParams.get("consumerNo") || "—";
    consumerName = searchParams.get("name") || "Consumer";
    serviceNumber = searchParams.get("serviceNo") || "—";
    billingPeriod = searchParams.get("month") || "Current Period";
    hasAuditRecord = true;
  }

  // 1. If no valid audit exists, display exact required empty state
  if (!hasAuditRecord) {
    return (
      <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 sm:p-12 shadow-xs space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
              <FileCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-[#0F172A]">
              No Audited Statement Available
            </h1>
            <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
              No audited electricity statement available. Upload and audit a bill to prepare a complaint.
            </p>
            <div className="pt-4 flex items-center justify-center">
              <Link
                href="/audit"
                className="px-5 py-2.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>{t("complaintPage.auditMyBill", "Audit My Bill")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Revalidate the audit data using canonical classification logic
  const classification = classifyVariance(
    actualBill,
    expectedBill,
    DEFAULT_DISPUTE_THRESHOLD,
    units
  );

  // Missing or invalid amounts
  if (classification.isInvalidOrMissing) {
    return (
      <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 sm:p-12 shadow-xs space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-[#0F172A]">
              Incomplete Statement Data
            </h1>
            <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
              {classification.summaryMessage || "Billed amount and units consumed must be positive numbers before a complaint draft can be prepared."}
            </p>
            <div className="pt-4 flex items-center justify-center">
              <Link
                href="/audit"
                className="px-5 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>Review Extracted Fields</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Within threshold: Statement matches tariff within statutory tolerance
  if (classification.isWithinThreshold) {
    return (
      <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 sm:p-12 shadow-xs space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-[#22C55E] flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-[#0F172A]">
              {t("complaintPage.compliantTitle", "Active Statement is Tariff Compliant")}
            </h1>
            <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
              The audited bill matches approved APERC tariff schedules within the statutory tolerance of ₹25 (detected variance: {difference >= 0 ? "+" : ""}₹{difference}). An overcharge dispute is not indicated.
            </p>
            <div className="pt-4 flex items-center justify-center">
              <Link
                href="/audit"
                className="px-5 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span>{t("buttons.auditAnother", "Audit Another Statement")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOvercharge = classification.isOvercharge;
  const absVariance = classification.absoluteVariance;

  const complaintData: ComplaintData = {
    recipientTitle: "The Superintending Engineer / Grievance Redressal Forum",
    discomName: discom,
    division: `${discom} Consumer Redressal Division, Andhra Pradesh`,
    consumerName: consumerName,
    consumerNumber: consumerNumber,
    billingPeriod: billingPeriod,
    actualBill: actualBill,
    expectedBill: expectedBill,
    difference: difference,
    units: units,
    date: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };

  const defaultLetterText = aiService.generateComplaintLetter(complaintData);
  const letterText = editedLetterText !== null ? editedLetterText : defaultLetterText;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    generateComplaintPDF(
      {
        consumerName: consumerName,
        consumerNumber: consumerNumber,
        serviceNumber: serviceNumber || "N/A",
        discom: discom,
        billingMonth: billingPeriod,
        units: units,
        actualBill: actualBill,
        expectedBill: expectedBill,
        difference: difference,
        letterBody: letterText,
      },
      { language: activeLanguage }
    );
  };

  const handleEmailDraft = () => {
    const email =
      discom === "APEPDCL"
        ? "cmd@apepdcl.in"
        : discom === "APCPDCL"
        ? "grievances@apcpdcl.in"
        : "customercare@apspdcl.in";

    const subject = encodeURIComponent(
      isOvercharge
        ? `Dispute Notice: Excess Billing for Consumer A/C ${consumerNumber} (${discom})`
        : `Billing Clarification Request: Statement Inquiry for Consumer A/C ${consumerNumber} (${discom})`
    );
    const body = encodeURIComponent(letterText);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-8 lg:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border flex items-center gap-1 ${
                  isOvercharge
                    ? "text-red-800 bg-red-50 border-red-200"
                    : "text-amber-800 bg-amber-50 border-amber-200"
                }`}
              >
                <ShieldAlert className={`w-3.5 h-3.5 ${isOvercharge ? "text-red-600" : "text-amber-600"}`} />
                {isOvercharge
                  ? `Statutory Overcharge Dispute Notice (+₹${difference})`
                  : `Statement Ledger Clarification Request (-₹${absVariance})`}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {isOvercharge
                ? "Consumer Overcharge Dispute Representation"
                : "Billing Statement Clarification & Inquiry"}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isOvercharge
                ? "Formal representation drafted under APERC Consumer Grievance Redressal Forum (CGRF) regulations for an overcharge."
                : "Formal statement inquiry requesting itemized ledger verification for an unexpected undercharge or subsidy credit."}
            </p>
          </div>

          {/* Top Actions: Download PDF, Send Email, Copy Text */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("buttons.downloadPdf", "Download PDF")}</span>
            </button>

            <button
              onClick={handleEmailDraft}
              className="px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t("buttons.sendEmail", "Send Email")}</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">{t("buttons.copied", "Copied!")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t("buttons.copyText", "Copy Text")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* COMPLAINT / CLARIFICATION NOTICE PREVIEW */}
        <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-md p-6 sm:p-10 text-left font-serif space-y-6">
          
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 font-sans text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                {isOvercharge ? "Formal Dispute Representation" : "Statement Clarification Representation"}
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                {isOvercharge
                  ? "CONSUMER BILLING GRIEVANCE INQUIRY (OVERCHARGE CLAIM)"
                  : "CONSUMER BILLING LEDGER CLARIFICATION REQUEST"}
              </h2>
              <span className="text-slate-500 text-[11px]">
                Formatted under APERC Consumer Grievance Redressal Guidelines
              </span>
            </div>
            <div className="sm:text-right font-mono text-[11px] text-slate-600">
              <div>Date: {complaintData.date}</div>
              <div>DISCOM: {discom}</div>
              <div>Consumer No: {consumerNumber}</div>
            </div>
          </div>

          {/* Letter Body - Editable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-sans">
              <span className="font-semibold text-slate-700">Representation Draft (Editable)</span>
              {editedLetterText !== null && (
                <button
                  type="button"
                  onClick={() => setEditedLetterText(null)}
                  className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                >
                  Reset to Original Draft
                </button>
              )}
            </div>
            <textarea
              value={letterText}
              onChange={(e) => setEditedLetterText(e.target.value)}
              rows={16}
              className="w-full text-slate-800 text-xs sm:text-sm leading-relaxed font-mono bg-slate-50/70 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
              aria-label="Editable Complaint Notice Content"
            />
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 font-sans">
            <span className="text-xs text-slate-500">
              {isOvercharge ? (
                <>
                  Calculated Overcharge: <strong className="text-red-600 font-mono">+₹{difference}</strong> beyond approved APERC tariff
                </>
              ) : (
                <>
                  Statement Credit / Undercharge: <strong className="text-amber-600 font-mono">-₹{absVariance}</strong> below standard calculation
                </>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="px-3.5 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("buttons.downloadPdf", "Download PDF")}</span>
              </button>

              <button
                onClick={handleEmailDraft}
                className="px-3.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{t("buttons.sendEmail", "Send Email")}</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t("buttons.copied", "Copied!") : t("buttons.copyText", "Copy Text")}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function ComplaintPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Loading complaint notice...
        </div>
      }
    >
      <ComplaintContent />
    </Suspense>
  );
}
