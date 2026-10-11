"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  ArrowRight,
  FileText,
  ShieldCheck,
  Scale,
  Info,
  Camera,
  Sparkles,
  X,
} from "lucide-react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import { useAuditStore } from "@/lib/auditStore";
import { useAppTranslation } from "@/lib/i18n";
import { CompactTimeline } from "@/components/audit/CompactTimeline";
import { EditableBillFields } from "@/components/audit/EditableBillFields";
import { generateAuditReportPDF } from "@/lib/pdfGenerator";
import { classifyVariance, DEFAULT_DISPUTE_THRESHOLD } from "@/lib/apTariffEngine";

function getAuditOrbState(stageText: string): OrbState {
  if (
    stageText === "Reading your statement" ||
    stageText === "Checking extracted details"
  ) {
    return "searching"; // OCR and bill-field extraction
  }
  if (stageText === "Calculating your expected bill") {
    return "solving"; // deterministic tariff calculation
  }
  if (
    stageText === "Uploading your bill" ||
    stageText === "Saving your audit"
  ) {
    return "connecting"; // waiting for an external service
  }
  return "working"; // other active processing
}

export default function AuditPage() {
  const {
    uploadedFile,
    pipelineStep,
    isAnalyzing,
    uploadProgress,
    uploadError,
    processingStageText,
    isDemoBill,
    activeLanguage,
    extractedData,
    ocrValidation,
    auditResult,
    uploadBill,
    replaceBill,
    retryLastUpload,
    loadDemoBill,
    removeBill,
    clearUploadError,
    updateExtractedField,
    confirmOcrAndAudit,
  } = useAuditStore();

  const { t } = useAppTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const prefersReducedMotion = React.useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => (typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false),
    () => false
  );

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "true") {
        loadDemoBill(0);
      }
    }
  }, [loadDemoBill]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadBill(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadBill(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      replaceBill(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleDownloadPDF = () => {
    if (auditResult) {
      generateAuditReportPDF(auditResult, { language: activeLanguage });
    }
  };


  const varianceClassification = auditResult
    ? classifyVariance(
        auditResult.actualBill,
        auditResult.expectedBill,
        DEFAULT_DISPUTE_THRESHOLD,
        auditResult.unitsConsumed,
        auditResult.meterMatch
      )
    : null;

  const isPotentialOvercharge = varianceClassification?.isOvercharge ?? false;
  const isUnderchargeOrCredit = varianceClassification?.isUnderchargeOrCredit ?? false;
  const isWithinThreshold = varianceClassification?.isWithinThreshold ?? false;
  const isIncomplete = varianceClassification?.isInvalidOrMissing ?? false;
  const status = varianceClassification?.status ?? auditResult?.status;

  // Show upload screen if no file is uploaded and no audit result exists

  const showUploadScreen = !uploadedFile && !auditResult && !isAnalyzing;

  // Show review screen if file has been extracted (step 3) and audit is not yet finalized
  const showReviewScreen = !isAnalyzing && pipelineStep === 3 && !auditResult;

  // Show audit result screen
  const showAuditResult = !isAnalyzing && auditResult !== null;

  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-6 lg:py-8 print:bg-white print:py-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={handleReplaceChange}
        />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {t("auditPage.badge", "Official APERC Tariff Verification")}
              </span>
              {isDemoBill && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Sample Data Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {t("auditPage.title", "Audit Electricity Bill")}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {t("auditPage.subtitle", "Deterministic verification against Andhra Pradesh Electricity Regulatory Commission retail tariff gazette.")}
            </p>
          </div>

          {/* Quick Sample Button (when in empty upload state) */}
          {showUploadScreen && (
            <button
              onClick={() => loadDemoBill(0)}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{t("auditPage.dropDemo", "Try Sample Bill")}</span>
            </button>
          )}
        </div>

        {/* Error Alert with Dismiss & Retry */}
        {uploadError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => retryLastUpload()}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold text-xs transition-colors cursor-pointer"
              >
                {t("auditPage.retry", "Retry Processing")}
              </button>
              <button
                type="button"
                onClick={clearUploadError}
                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Compact Stepper */}
        {pipelineStep > 0 && (
          <CompactTimeline
            currentStep={pipelineStep}
            isAnalyzing={isAnalyzing}
          />
        )}

        {/* ================================================================ */}
        {/* STATE 1: EMPTY UPLOAD SCREEN                                    */}
        {/* ================================================================ */}
        {showUploadScreen && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-white shadow-xs ${
              dragOver ? "border-[#22C55E] bg-emerald-50/20 scale-[1.005]" : "border-[#CBD5E1]"
            }`}
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-4 shadow-2xs">
              <UploadCloud className="w-8 h-8 text-slate-700" />
            </div>

            <h2 className="text-lg font-bold text-[#0F172A] mb-1">
              {t("auditPage.dropTitle", "Upload Your Electricity Statement")}
            </h2>
            <p className="text-xs text-[#64748B] max-w-md mx-auto mb-6">
              {t("auditPage.dropSub", "Upload a clear PDF or photo of your electricity bill from APSPDCL, APCPDCL, or APEPDCL.")}
            </p>

            {/* Actions: Upload, Take Photo, Sample Bill */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>{t("auditPage.dropSelect", "Upload Bill Document")}</span>
              </button>

              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <Camera className="w-4 h-4 text-slate-600" />
                <span>{t("auditPage.dropCamera", "Take Photo")}</span>
              </button>

              <button
                onClick={() => loadDemoBill(0)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[#0F172A] hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{t("auditPage.dropDemo", "Try Demo Bill")}</span>
              </button>
            </div>

            {/* Badges and metadata */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Supported: PDF, JPG, JPEG, PNG
              </span>
              <span>•</span>
              <span>Max Size: 15MB</span>
              <span>•</span>
              <span>APERC 100% Deterministic Engine</span>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STATE 2: ACTIVE UPLOAD / OCR EXTRACTION IN-PROGRESS              */}
        {/* ================================================================ */}
        {isAnalyzing && (
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 sm:p-12 text-center shadow-xs space-y-5">
            {/* ThinkingOrb Loading Indicator */}
            <div className="flex items-center justify-center py-2">
              <ThinkingOrb
                state={getAuditOrbState(processingStageText)}
                size={64}
                paused={prefersReducedMotion}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                {processingStageText}
              </h2>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                {processingStageText === "Uploading your bill"
                  ? "Transferring statement securely to encrypted document store."
                  : processingStageText === "Reading your statement"
                  ? "Extracting consumer units, tariffs, readings, and statutory fees."
                  : processingStageText === "Checking extracted details"
                  ? "Verifying arithmetic consistency and tariff category."
                  : processingStageText === "Calculating your expected bill"
                  ? "Computing APERC gazetted slab rates and connection charges."
                  : processingStageText === "Saving your audit"
                  ? "Persisting audit summary to Amazon DynamoDB."
                  : "Analyzing statement and statutory compliance."}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {uploadProgress}% {t("auditPage.completed", "completed")}
            </span>
          </div>
        )}

        {/* ================================================================ */}
        {/* STATE 3: REVIEW & EDIT EXTRACTED FIELDS BEFORE AUDIT             */}
        {/* ================================================================ */}
        {showReviewScreen && (
          <div className="space-y-6">
            {/* Active Document Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#CBD5E1] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {uploadedFile?.name || "Uploaded_Statement.pdf"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB • ` : ""}
                    {extractedData.discom} • {extractedData.billingMonth}
                  </span>
                </div>
                {isDemoBill && (
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Sample Bill
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => replaceInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Replace Bill</span>
                </button>

                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Remove Bill</span>
                </button>
              </div>
            </div>

            {/* Instruction Notice */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-3 text-left">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">
                  Verify Extracted Billing Parameters:
                </strong>
                Please review the fields extracted from your statement. Correct any discrepancies before calculating your APERC tariff compliance audit.
              </div>
            </div>

            {/* Editable Fields Component */}
            <EditableBillFields
              data={extractedData}
              validation={ocrValidation}
              onFieldChange={updateExtractedField}
              onConfirm={confirmOcrAndAudit}
            />

            {/* Action to finalize audit */}
            <div className="flex justify-end pt-2">
              <button
                onClick={confirmOcrAndAudit}
                className="px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs tracking-wide transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                <span>Calculate APERC Tariff Audit</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STATE 4: FINALIZED AUDIT REPORT                                  */}
        {/* ================================================================ */}
        {showAuditResult && (
          <div className="space-y-6">
            
            {/* Synthetic Demo Warning Banner */}
            {(isDemoBill || auditResult.isDemo) && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-amber-950 mb-0.5 text-xs">
                    SYNTHETIC DEMO AUDIT (NOT A REAL CONSUMER RECORD)
                  </strong>
                  This audit is generated from sample demonstration data for interface testing and preview. It does not reflect a live utility account or real meter reading inspection.
                </div>
              </div>
            )}

            {/* Action Bar: Replace, Remove, Download PDF */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#CBD5E1] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {uploadedFile?.name || "Audited_Electricity_Statement.pdf"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB • ` : ""}
                    {auditResult.discom} • {auditResult.billingMonth} • Schedule {auditResult.tariffScheduleVersion || "APERC-TO-2026-27"}
                  </span>
                </div>
                {isDemoBill && (
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Sample Data
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => replaceInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Replace Bill</span>
                </button>

                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Remove Bill</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Audit PDF</span>
                </button>
              </div>
            </div>

            {/* 1. PRIMARY EXECUTIVE SUMMARY CARD */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden text-left">
              <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Executive Audit Summary
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Consumer: {extractedData.consumerName || "Consumer"} • Service: {extractedData.serviceNumber || "—"} • Month: {auditResult.billingMonth}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold font-mono ${
                      isPotentialOvercharge
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : isUnderchargeOrCredit || isIncomplete
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {isPotentialOvercharge ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    ) : isUnderchargeOrCredit || isIncomplete ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {status || "Verified"}
                  </span>
                </div>
              </div>

              {/* Core Monetary Figures */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                {/* Expected Bill */}
                <div className="text-left">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    APERC Expected Amount
                  </span>
                  <div className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                    ₹{auditResult.expectedBill.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Statutory APERC Tariff Calculation
                  </span>
                </div>

                {/* Actual Bill */}
                <div className="sm:pl-6 text-left pt-4 sm:pt-0">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Actual Billed Amount
                  </span>
                  <div className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                    ₹{auditResult.actualBill.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Utility Billed Statement Total
                  </span>
                </div>

                {/* Variance */}
                <div className="sm:pl-6 text-left pt-4 sm:pt-0">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Detected Variance
                  </span>
                  <div
                    className={`text-3xl font-bold font-mono tracking-tight ${
                      isPotentialOvercharge
                        ? "text-red-600"
                        : isUnderchargeOrCredit
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {auditResult.difference > 0 ? "+" : ""}
                    ₹{auditResult.difference.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                    {auditResult.percentageDifference}% variance
                  </span>
                </div>
              </div>

              {/* Concise Explanation of Contributing Factors */}
              <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-700">
                <span className="font-semibold text-slate-900 block mb-0.5">
                  Contributing Factors:
                </span>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {auditResult.varianceExplanation}
                </p>
              </div>

              {/* Audit Reliability & Complaint Action */}
              <div className="px-6 py-3 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    Audit Reliability:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      auditResult.auditReliability.level === "High"
                        ? "bg-emerald-100 text-emerald-800"
                        : auditResult.auditReliability.level === "Medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {auditResult.auditReliability.level}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    — {auditResult.auditReliability.reason}
                  </span>
                </div>

                {isPotentialOvercharge ? (
                  <Link
                    href="/complaint"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Generate Complaint (+₹{auditResult.difference})</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : isUnderchargeOrCredit ? (
                  <Link
                    href="/complaint"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Review Bill / View Details (-₹{Math.abs(auditResult.difference)})</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : isWithinThreshold ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tariff Verified: No Dispute Needed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Validation Pending
                  </span>
                )}
              </div>
            </div>

            {/* 2. DETERMINISTIC AUDIT EVIDENCE & SLAB BREAKDOWN (Only to explain calculation) */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] p-5 shadow-2xs text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                    Statutory Slab Calculation Breakdown
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {auditResult.tariffScheduleVersion || "APERC-TO-2026-27"}
                </span>
              </div>

              {/* Slabs Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Tariff Slab Applied</th>
                      <th className="px-3 py-2">Units in Slab</th>
                      <th className="px-3 py-2">Statutory Rate</th>
                      <th className="px-3 py-2 text-right">Calculated Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditResult.slabs.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-medium text-slate-800">{s.slabRange}</td>
                        <td className="px-3 py-2 font-mono">{s.unitsInSlab} units</td>
                        <td className="px-3 py-2 font-mono">₹{s.ratePerUnit.toFixed(2)}/u</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 text-right">
                          ₹{s.cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td colSpan={3} className="px-3 py-2">Total Energy Charges</td>
                      <td className="px-3 py-2 font-mono text-right">₹{auditResult.totalEnergyCharges.toFixed(2)}</td>
                    </tr>
                    <tr className="text-slate-700 hover:bg-slate-50/50">
                      <td colSpan={3} className="px-3 py-1.5 pl-6 text-[11px]">Customer Meter Charges (APERC Tiered)</td>
                      <td className="px-3 py-1.5 font-mono text-right text-[11px]">₹{auditResult.customerCharges.toFixed(2)}</td>
                    </tr>
                    <tr className="text-slate-700 hover:bg-slate-50/50">
                      <td colSpan={3} className="px-3 py-1.5 pl-6 text-[11px]">Fixed Charges (Connection Baseline)</td>
                      <td className="px-3 py-1.5 font-mono text-right text-[11px]">₹{auditResult.fixedCharges.toFixed(2)}</td>
                    </tr>
                    <tr className="text-slate-700 hover:bg-slate-50/50">
                      <td colSpan={3} className="px-3 py-1.5 pl-6 text-[11px]">Electricity Duty (6 paise/unit)</td>
                      <td className="px-3 py-1.5 font-mono text-right text-[11px]">₹{auditResult.electricityDuty.toFixed(2)}</td>
                    </tr>
                    <tr className="text-slate-700 hover:bg-slate-50/50">
                      <td colSpan={3} className="px-3 py-1.5 pl-6 text-[11px]">FPPCA Fuel Surcharge</td>
                      <td className="px-3 py-1.5 font-mono text-right text-[11px]">₹{auditResult.fppcaFuelSurcharge.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t border-slate-300">
                      <td colSpan={3} className="px-3 py-2 text-xs">Total Reconciled Expected Bill</td>
                      <td className="px-3 py-2 font-mono text-right text-xs">₹{auditResult.expectedBill.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Statutory Formula Breakdown */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">Calculation Formula:</span>
                {auditResult.calculationFormula}
              </div>
            </div>

            {/* 3. CONSUMER GRIEVANCE INFORMATION (When variance observed) */}
            {isPotentialOvercharge && (
              <div className="bg-white rounded-xl border border-red-200 bg-red-50/20 p-5 shadow-2xs text-left space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-red-950">
                    APERC Consumer Grievance Information (Overcharge Detected)
                  </h3>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div>
                    <strong className="text-slate-900">Governing Regulation:</strong>{" "}
                    {auditResult.consumerRights.regulations}
                  </div>
                  <div>
                    <strong className="text-slate-900">Grievance Process:</strong>{" "}
                    {auditResult.consumerRights.timeline}
                  </div>
                  <div>
                    <strong className="text-slate-900">Grievance Eligibility:</strong>{" "}
                    {auditResult.consumerRights.eligibility}
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/complaint"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Generate Complaint (+₹{auditResult.difference})</span>
                  </Link>
                </div>
              </div>
            )}

            {isUnderchargeOrCredit && (
              <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-5 shadow-2xs text-left space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                    Statement Review & Ledger Verification (Credit / Undercharge Detected)
                  </h3>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div>
                    <strong className="text-slate-900">Review Summary:</strong>{" "}
                    Actual billed statement is ₹{Math.abs(auditResult.difference).toLocaleString("en-IN")} below standard APERC retail calculations.
                  </div>
                  <div>
                    <strong className="text-slate-900">Possible Causes:</strong>{" "}
                    Prompt payment rebates, state subsidies, solar net-metering export credits, cycle adjustments, or an anomalous meter entry.
                  </div>
                  <div>
                    <strong className="text-slate-900">Action:</strong>{" "}
                    {auditResult.consumerRights.eligibility}
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/complaint"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Review Bill / View Details (-₹{Math.abs(auditResult.difference)})</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* CONFIRMATION MODAL FOR DESTRUCTIVE REMOVE ACTION                */}
        {/* ================================================================ */}
        {showRemoveConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 text-left shadow-xl space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Remove Statement?
                  </h3>
                  <p className="text-xs text-slate-500">
                    This will clear the current analysis and return to the upload screen.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-slate-900">
                  {uploadedFile?.name || "this document"}
                </span>
                ? Your previously saved statements in the Audit History Ledger will remain completely safe.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeBill();
                    setShowRemoveConfirm(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Yes, Remove Bill
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
