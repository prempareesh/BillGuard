"use client";

import React from "react";
import { Check, Loader2 } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n";

interface CompactTimelineProps {
  currentStep: number; // 1: Uploaded, 2: OCR, 3: Tariff Match, 4: Calculation, 5: Audit Complete
  isAnalyzing: boolean;
}

export const CompactTimeline: React.FC<CompactTimelineProps> = ({
  currentStep,
  isAnalyzing,
}) => {
  const { t } = useAppTranslation();

  if (currentStep === 0) return null;

  const steps = [
    { step: 1, label: t("stepper.uploaded", "Uploaded") },
    { step: 2, label: t("stepper.ocr", "OCR") },
    { step: 3, label: t("stepper.tariffLookup", "Tariff Lookup") },
    { step: 4, label: t("stepper.calculation", "Calculation") },
    { step: 5, label: t("stepper.auditComplete", "Audit Complete") },
  ];

  return (
    <div className="bg-white px-3.5 py-2 rounded-xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between gap-3 overflow-x-auto text-left">
      <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-slate-100">
        <span
          className={`w-2 h-2 rounded-full ${
            currentStep >= 5 && !isAnalyzing
              ? "bg-[#22C55E]"
              : "bg-blue-500 animate-pulse"
          }`}
        />
        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">
          {currentStep >= 5 && !isAnalyzing ? "Verified" : `Auditing (${currentStep}/5)...`}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-1 justify-between min-w-[340px]">
        {steps.map((s, idx) => {
          const isDone =
            currentStep > s.step ||
            (currentStep === 5 && s.step === 5 && !isAnalyzing);
          const isCurrent = currentStep === s.step && isAnalyzing;

          return (
            <React.Fragment key={s.step}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold font-mono transition-colors ${
                    isDone
                      ? "bg-[#22C55E] text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white ring-2 ring-blue-300 animate-pulse"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-2 h-2 animate-spin" />
                  ) : (
                    s.step
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold whitespace-nowrap ${
                    isDone
                      ? "text-slate-800"
                      : isCurrent
                      ? "text-blue-700 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${
                    currentStep > s.step ? "bg-emerald-400" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
