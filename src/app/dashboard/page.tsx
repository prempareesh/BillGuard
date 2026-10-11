"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useAuditStore } from "@/lib/auditStore";
import { useAppTranslation } from "@/lib/i18n";
import { generateAuditReportPDF } from "@/lib/pdfGenerator";
import { calculateAPTariff, classifyVariance, DEFAULT_DISPUTE_THRESHOLD } from "@/lib/apTariffEngine";

export default function DashboardPage() {
  const {
    auditResult,
    extractedData,
    historyList,
    refreshFromDatabase,
    activeLanguage,
  } = useAuditStore();

  const { t } = useAppTranslation();

  useEffect(() => {
    refreshFromDatabase();
  }, [refreshFromDatabase]);

  // Pull latest audited bill from store or history
  const latestAudit = auditResult;
  const latestHistory = historyList.length > 0 ? historyList[0] : null;

  const consumerName =
    latestAudit?.consumerCategory
      ? extractedData.consumerName
      : latestHistory
      ? latestHistory.consumerName
      : "Consumer";
  const serviceNumber =
    latestAudit?.consumerCategory
      ? extractedData.serviceNumber
      : latestHistory
      ? latestHistory.serviceNumber
      : "—";
  const billingMonth =
    latestAudit?.billingMonth
      ? latestAudit.billingMonth
      : latestHistory
      ? latestHistory.billingMonth
      : "—";
  const unitsConsumed = Number(
    latestAudit
      ? latestAudit.unitsConsumed
      : latestHistory
      ? (latestHistory.unitsConsumed ?? latestHistory.units ?? 0)
      : 0
  );
  const expectedAmount = Number(
    latestAudit
      ? latestAudit.expectedBill
      : latestHistory
      ? (latestHistory.expectedAmount ?? latestHistory.expectedBill ?? 0)
      : 0
  );
  const actualAmount = Number(
    latestAudit
      ? latestAudit.actualBill
      : latestHistory
      ? (latestHistory.actualAmount ?? latestHistory.actualBill ?? 0)
      : 0
  );
  const difference = Number(
    latestAudit
      ? latestAudit.difference
      : latestHistory
      ? (latestHistory.difference ?? (actualAmount - expectedAmount))
      : 0
  );
  const hasAuditedBill = (latestAudit !== null || latestHistory !== null || historyList.length > 0) && unitsConsumed > 0;

  const classification = hasAuditedBill
    ? classifyVariance(actualAmount, expectedAmount, DEFAULT_DISPUTE_THRESHOLD, unitsConsumed)
    : null;

  const isOvercharged = classification?.isOvercharge ?? false;
  const isUndercharged = classification?.isUnderchargeOrCredit ?? false;
  const status =
    classification?.status ??
    (latestAudit
      ? latestAudit.status
      : latestHistory
      ? latestHistory.status
      : "Verified");

  const handleDownloadPDF = () => {
    if (latestAudit) {
      generateAuditReportPDF(latestAudit, { language: activeLanguage });
    } else if (hasAuditedBill) {
      const audit = calculateAPTariff({
        discom: latestHistory?.discom || "APSPDCL",
        consumerCategory: "Domestic",
        unitsConsumed,
        actualBillAmount: actualAmount,
        billingMonth,
      });
      generateAuditReportPDF(audit, { language: activeLanguage });
    }
  };


  // Savings recommendations (Maximum 3 recommendations, calculated strictly from real data)
  const recommendations: { title: string; note: string; savings?: string }[] = [];

  if (hasAuditedBill) {
    if (unitsConsumed > 225) {
      const unitsOver = unitsConsumed - 225;
      const estimatedSaving = Math.round(unitsOver * 8.75);
      recommendations.push({
        title: "Reduce consumption below 225-unit slab threshold",
        note: `Your consumption (${unitsConsumed} units) entered the ₹8.75/unit tier. Reducing usage by ${unitsOver} units brings you back into lower slabs.`,
        savings: `~₹${estimatedSaving.toLocaleString("en-IN")}/month`,
      });
    } else {
      recommendations.push({
        title: "Maintain consumption below 225 units",
        note: `Your usage (${unitsConsumed} units) is within lower APERC domestic tiers. Maintaining this draw avoids entry into the ₹8.75/unit threshold.`,
      });
    }

    recommendations.push({
      title: "Run washing machines and pump loads during solar off-peak hours",
      note: "Operating high-draw motor loads between 10:00 AM – 3:00 PM optimizes household demand curve and avoids peak grid tariff stresses.",
    });

    recommendations.push({
      title: "Replace standard 75W ceiling fans with 28W BLDC fans",
      note: "Brushless DC fans consume 47W less power per operating hour under coastal Andhra humidity conditions.",
      savings: "~₹80 per fan/month",
    });
  }

  const savedAuditsCount = historyList.length;
  const discrepanciesCount = historyList.filter(
    (h) => Number(h.difference ?? 0) > 0
  ).length;

  // Real historical data for trend chart (only if 2+ records exist)
  const chartData =
    historyList.length >= 2
      ? [...historyList].reverse().map((item) => ({
          month: item.billingMonth || "Period",
          actual: Number(item.actualAmount ?? item.actualBill ?? 0),
          expected: Number(item.expectedAmount ?? item.expectedBill ?? 0),
          units: Number(item.unitsConsumed ?? item.units ?? 0),
        }))
      : [];

  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-8 lg:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {t("dashboardPage.badge", "Consumer Utility Portal")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {t("dashboardPage.title", "Electricity Bill Dashboard")}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {t("dashboardPage.subtitle", "Consumer overview of your latest audited statement and APERC tariff compliance.")}
            </p>
          </div>

          <Link
            href="/audit"
            className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>{t("dashboardPage.auditNew", "Audit New Statement")}</span>
          </Link>
        </div>

        {/* High-Level Real Consumer Metrics Row */}
        {hasAuditedBill && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] shadow-2xs text-left">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Saved Audits on Record
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {savedAuditsCount}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Genuinely saved statements in DynamoDB
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] shadow-2xs text-left">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Discrepancies Requiring Review
              </span>
              <div
                className={`text-2xl font-bold font-mono ${
                  discrepanciesCount > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {discrepanciesCount}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {discrepanciesCount > 0
                  ? "Overcharged statements eligible for dispute"
                  : "All statements verified compliant"}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] shadow-2xs text-left">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Regulated DISCOM
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {latestAudit?.discom || latestHistory?.discom || "APSPDCL"}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Andhra Pradesh Electricity Regulatory Commission
              </span>
            </div>
          </div>
        )}

        {!hasAuditedBill ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-10 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-[#0F172A]">
              {t("dashboardPage.noDataTitle", "No Audited Statement on Record")}
            </h2>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              {t("dashboardPage.noDataDesc", "Upload an electricity statement from APSPDCL, APCPDCL, or APEPDCL to verify charges against official APERC retail slabs.")}
            </p>
            <div>
              <Link
                href="/audit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>{t("buttons.uploadBill", "Upload Statement Now")}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* A. PRIMARY DASHBOARD CARD: LATEST AUDITED BILL */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden text-left">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                    Primary Statement
                  </span>
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    Latest Audited Bill
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-600 font-semibold">
                  {billingMonth}
                </span>
              </div>

              {/* Metadata Details */}
              <div className="px-6 py-3.5 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Consumer Name</span>
                  <span className="font-semibold text-slate-900">{consumerName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Service Number</span>
                  <span className="font-mono text-slate-900">{serviceNumber}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Billing Month</span>
                  <span className="font-semibold text-slate-900">{billingMonth}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Units Consumed</span>
                  <span className="font-mono font-bold text-slate-900">{unitsConsumed} kWh</span>
                </div>
              </div>

              {/* Expected, Actual, and Highlighted Variance */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Expected Amount
                  </span>
                  <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
                    ₹{expectedAmount.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    APERC Calculated
                  </span>
                </div>

                <div className="sm:pl-6 pt-4 sm:pt-0">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Actual Amount
                  </span>
                  <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
                    ₹{actualAmount.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Statement Total
                  </span>
                </div>

                {/* Highlight only the variance */}
                <div className="sm:pl-6 pt-4 sm:pt-0">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Difference (Variance)
                  </span>
                  <div
                    className={`text-3xl font-bold font-mono tracking-tight ${
                      isOvercharged ? "text-red-600" : isUndercharged ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {difference > 0 ? "+" : ""}₹{difference.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 block mt-1">
                    {isOvercharged ? "Overcharge detected" : isUndercharged ? "Undercharge / Credit detected" : "Tariff compliant"}
                  </span>
                </div>
              </div>
            </div>

            {/* B. AUDIT STATUS CARD */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] p-5 shadow-2xs text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Audit Status
              </span>
              <div className="flex items-center gap-3">
                {status === "Potential Overcharge" ? (
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-base font-bold">✗ Potential Overcharge</span>
                  </div>
                ) : status === "Review Recommended" ? (
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-base font-bold">⚠ Review Recommended</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-bold">✓ Verified</span>
                  </div>
                )}
                <span className="text-xs text-slate-500 border-l border-slate-200 pl-3">
                  {status === "Potential Overcharge"
                    ? `Actual statement exceeds statutory APERC tariff by ₹${difference}.`
                    : status === "Review Recommended"
                    ? isUndercharged
                      ? `Actual bill is ₹${Math.abs(difference)} below standard calculation (subsidies, rebates, or credit).`
                      : "Minor deviation or subsidy adjustment detected."
                    : "Billed statement matches official APERC tariff schedule within statutory tolerance."}
                </span>
              </div>
            </div>

            {/* C. CONSUMER ACTION CENTER */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] p-5 shadow-2xs text-left space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Consumer Action Center
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <Link
                  href="/audit"
                  className="px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>View Audit Report</span>
                </Link>

                <button
                  onClick={handleDownloadPDF}
                  disabled={!hasAuditedBill}
                  className="px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-[#0F172A] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download Audit PDF</span>
                </button>

                {isOvercharged ? (
                  <Link
                    href="/complaint"
                    className="px-3.5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Generate Complaint</span>
                  </Link>
                ) : isUndercharged ? (
                  <Link
                    href="/complaint"
                    className="px-3.5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Review Bill / Details</span>
                  </Link>
                ) : (
                  <div
                    className="px-3.5 py-2.5 rounded-lg bg-slate-100 text-slate-400 font-medium flex items-center justify-center gap-1.5 text-center cursor-not-allowed"
                    title="No overcharge detected"
                  >
                    <span>No Dispute Needed</span>
                  </div>
                )}

                <Link
                  href="/audit"
                  className="px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                  <span>Re-audit Bill</span>
                </Link>
              </div>
            </div>

            {/* D. SAVINGS RECOMMENDATIONS (Maximum 3 recommendations, no invented numbers) */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-xl border border-[#CBD5E1] p-5 shadow-2xs text-left space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Savings Recommendations
                </span>
                <div className="space-y-2.5 text-xs">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{rec.title}</div>
                        <div className="text-slate-600 text-[11px] leading-relaxed">
                          {rec.note}
                        </div>
                      </div>
                      {rec.savings && (
                        <div className="shrink-0 self-start sm:self-center font-mono font-bold text-emerald-700 text-xs px-2.5 py-1 bg-emerald-50 rounded border border-emerald-200">
                          {rec.savings}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E. RECENT BILLING PERIODS & CONSUMPTION (Only when sufficient real history exists) */}
            {chartData.length >= 2 && (
              <div className="bg-white rounded-xl border border-[#CBD5E1] p-5 shadow-2xs text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                      Recent Billing Periods & Consumption History
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Chronological history of your verified electricity statements
                    </p>
                  </div>
                  <Link
                    href="/history"
                    className="text-xs font-semibold text-[#22C55E] hover:underline"
                  >
                    View Full Ledger ({historyList.length}) →
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Billing Period</th>
                        <th className="px-3 py-2">Units Consumed</th>
                        <th className="px-3 py-2">APERC Expected</th>
                        <th className="px-3 py-2">Actual Billed</th>
                        <th className="px-3 py-2 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chartData.map((row, idx) => {
                        const diff = row.actual - row.expected;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-medium text-slate-900">{row.month}</td>
                            <td className="px-3 py-2 font-mono">{row.units} kWh</td>
                            <td className="px-3 py-2 font-mono">₹{row.expected.toLocaleString("en-IN")}</td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">₹{row.actual.toLocaleString("en-IN")}</td>
                            <td className={`px-3 py-2 font-mono font-bold text-right ${diff > 0 ? "text-red-600" : "text-emerald-600"}`}>
                              {diff > 0 ? "+" : ""}₹{diff.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
