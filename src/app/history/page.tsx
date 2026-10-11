"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  FileCheck,
  Trash2,
  FileText,
  Clock,
} from "lucide-react";
import { useAuditStore, StoredAuditRecord } from "@/lib/auditStore";
import { useAppTranslation } from "@/lib/i18n";
import { generateAuditReportPDF } from "@/lib/pdfGenerator";
import { calculateAPTariff, classifyVariance, DEFAULT_DISPUTE_THRESHOLD } from "@/lib/apTariffEngine";

export default function HistoryPage() {
  const router = useRouter();
  const { t } = useAppTranslation();
  const {
    historyList,
    refreshFromDatabase,
    deleteHistoryItem,
    clearHistory,
    loadAuditFromHistory,
    activeLanguage,
  } = useAuditStore();

  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  useEffect(() => {
    refreshFromDatabase();
  }, [refreshFromDatabase]);

  const handleDeleteItem = async (id: string) => {
    setDeleteError(null);
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(`Failed to delete record: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to permanently clear all audit history?")) {
      return;
    }
    setDeleteError(null);
    try {
      await clearHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(`Failed to clear history: ${msg}`);
    }
  };

  const handleDownloadPDFForRecord = (record: StoredAuditRecord) => {
    const actualVal = Number(record.actualAmount ?? record.actualBill ?? 0);
    const unitsVal = Number(record.unitsConsumed ?? record.units ?? 0);
    const audit = calculateAPTariff({
      discom: record.discom || "APSPDCL",
      consumerCategory: "Domestic",
      unitsConsumed: unitsVal,
      actualBillAmount: actualVal,
      billingMonth: record.billingMonth || "August 2026",
      isDemo: Boolean(record.isDemo),
    });
    generateAuditReportPDF(audit, { language: activeLanguage });
  };


  const handleExportCSV = () => {
    const headers =
      "Audit ID,Consumer Name,Service Number,Consumer Number,Month,Units,Expected Amount,Actual Amount,Difference,Timestamp,Status\n";
    const rows = historyList
      .map((b) => {
        const actualVal = Number(b.actualAmount ?? b.actualBill ?? 0);
        const expectedVal = Number(b.expectedAmount ?? b.expectedBill ?? 0);
        const diffVal = Number(b.difference ?? (actualVal - expectedVal));
        const unitsVal = Number(b.unitsConsumed ?? b.units ?? 0);
        return `"${b.id}","${b.consumerName || ""}","${b.serviceNumber || ""}","${b.consumerNumber || ""}","${b.billingMonth || ""}",${unitsVal},${expectedVal},${actualVal},${diffVal},"${b.timestamp || ""}","${b.status || ""}"`;
      })
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BillGuard_Audit_History.csv`;
    a.click();
  };

  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-8 lg:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {t("historyPage.badge", "Audited Statements Ledger")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {t("historyPage.title", "Bill History")}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {t("historyPage.subtitle", "Verified records of past electricity statement audits. Chronological ledger of real uploaded statements.")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {historyList.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>{t("historyPage.exportCsv", "Export CSV")}</span>
              </button>
            )}
            <Link
              href="/audit"
              className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>{t("dashboardPage.auditNew", "Audit New Statement")}</span>
            </Link>
          </div>
        </div>

        {/* Error notification */}
        {deleteError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{deleteError}</span>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Ledger Table */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden text-left">
          {historyList.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {t("historyPage.emptyTitle", "No Statement Audits on Record")}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t("historyPage.emptyDesc", "No audits have been executed yet. Upload an electricity bill in the Audit section to begin building your persistent compliance ledger.")}
              </p>
              <div>
                <Link
                  href="/audit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{t("historyPage.auditFirst", "Audit First Statement")}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {historyList.length} Audited Statement{historyList.length > 1 ? "s" : ""} on File
                </span>
                <button
                  onClick={handleClearAll}
                  className="text-red-600 hover:text-red-700 font-semibold cursor-pointer text-[11px]"
                >
                  Clear All History
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-3">Consumer Name</th>
                      <th className="px-4 py-3">Service Number</th>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Units</th>
                      <th className="px-4 py-3">Expected</th>
                      <th className="px-4 py-3">Actual</th>
                      <th className="px-4 py-3">Difference</th>
                      <th className="px-4 py-3">Schedule</th>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {historyList.map((record, idx) => {
                      const actualVal = Number(record.actualAmount ?? record.actualBill ?? 0);
                      const expectedVal = Number(record.expectedAmount ?? record.expectedBill ?? 0);
                      const diffVal = Number(record.difference ?? (actualVal - expectedVal));
                      const unitsVal = Number(record.unitsConsumed ?? record.units ?? 0);
                      const classification = classifyVariance(actualVal, expectedVal, DEFAULT_DISPUTE_THRESHOLD, unitsVal);
                      const isOvercharge = classification.isOvercharge;
                      const isReview = classification.isUnderchargeOrCredit;

                      return (
                        <tr
                          key={`${record.id || "aud"}-${idx}`}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-[#0F172A]">
                            <div className="flex items-center gap-1.5">
                              <span>{record.consumerName || "Consumer"}</span>
                              {record.isDemo && (
                                <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  DEMO
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {record.serviceNumber || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium">
                            {record.billingMonth || "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800 font-bold">
                            {unitsVal} u
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800 font-semibold">
                            ₹{expectedVal.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-[#0F172A]">
                            ₹{actualVal.toLocaleString("en-IN")}
                          </td>
                          <td
                            className={`px-4 py-3 font-mono font-bold ${
                              isOvercharge ? "text-red-600" : isReview ? "text-amber-600" : "text-emerald-600"
                            }`}
                          >
                            {diffVal > 0 ? "+" : ""}₹{diffVal.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {record.tariffScheduleVersion || "APERC-TO-2026-27"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                            {record.timestamp}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                isOvercharge
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : isReview
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isOvercharge ? (
                                <XCircle className="w-3 h-3 text-red-600" />
                              ) : isReview ? (
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              )}
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Audit */}
                              <button
                                onClick={() => {
                                  loadAuditFromHistory(record);
                                  router.push("/audit");
                                }}
                                className="p-1 rounded text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="View & Re-audit Statement"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* Download PDF */}
                              <button
                                onClick={() => handleDownloadPDFForRecord(record)}
                                className="p-1 rounded text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* Generate Complaint / Review Inquiry */}
                              {isOvercharge && (
                                <Link
                                  href={`/complaint?auditId=${record.id}`}
                                  className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
                                  title="Generate Complaint"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </Link>
                              )}
                              {isReview && (
                                <Link
                                  href={`/complaint?auditId=${record.id}`}
                                  className="p-1 rounded text-amber-600 hover:bg-amber-50 transition-colors"
                                  title="Review Statement / Inquire"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </Link>
                              )}

                              {/* Delete Record */}
                              <button
                                onClick={() => handleDeleteItem(record.id)}
                                disabled={deletingId === record.id}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      </div>
    </div>
  );
}
