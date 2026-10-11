"use client";

import React from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { motion } from "framer-motion";

interface AuditTimelineProps {
  currentStep: number; // 1 to 6
  isAnalyzing: boolean;
}

const STEPS = [
  { step: 1, title: "Bill Uploaded", desc: "Document ingested & preprocessed" },
  { step: 2, title: "OCR Extraction Complete", desc: "Gemini Vision extracted 14 fields" },
  { step: 3, title: "APERC Tariff Identified", desc: "Slab thresholds mapped" },
  { step: 4, title: "Charges Verified", desc: "Deterministic mathematical audit" },
  { step: 5, title: "Anomaly Analysis Complete", desc: "Overcharge & variance detected" },
  { step: 6, title: "AI Explanation Generated", desc: "Multilingual insights ready" },
];

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  currentStep,
  isAnalyzing,
}) => {
  if (currentStep === 0) return null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs text-left">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            AI Verification Pipeline
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
          {currentStep >= 6 ? "Audit Complete (100%)" : `Step ${currentStep} of 6 In Progress...`}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STEPS.map((s) => {
          const isDone = currentStep > s.step || (currentStep === 6 && s.step === 6 && !isAnalyzing);
          const isCurrent = currentStep === s.step && isAnalyzing;

          return (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: s.step * 0.05 }}
              className={`p-3 rounded-xl border text-left transition-all ${
                isDone
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : isCurrent
                  ? "bg-blue-50/80 border-blue-300 text-blue-950 ring-2 ring-blue-400/20"
                  : "bg-slate-50/50 border-slate-200 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 font-mono">
                  Step 0{s.step}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300" />
                )}
              </div>

              <div className="font-bold text-xs leading-tight mb-0.5">
                {s.title}
              </div>
              <div className="text-[10px] opacity-75 leading-tight line-clamp-1">
                {s.desc}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
