"use client";

import React from "react";
import Link from "next/link";
import { X, ArrowRight, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { APAuditResult } from "@/lib/apTariffEngine";

interface SmartAlertModalProps {
  isOpen: boolean;
  audit: APAuditResult | null;
  onDismiss: () => void;
}

export const SmartAlertModal: React.FC<SmartAlertModalProps> = ({
  isOpen,
  audit,
  onDismiss,
}) => {
  if (!isOpen || !audit || audit.difference <= 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-7 text-left space-y-5"
        >
          {/* Close X */}
          <button
            onClick={onDismiss}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Alert Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded-full inline-block mb-1">
                APERC Compliance Flag
              </div>
              <h3 className="text-lg font-black text-[#0F172A] tracking-tight">
                Possible Overcharge Detected
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Your billed statement amount exceeds the statutory electricity tariff calculated under official Andhra Pradesh retail tariff slabs.
          </p>

          {/* 3 Metric Cards: Expected, Actual, Difference */}
          <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="p-2 rounded-xl bg-white border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-0.5">
                Expected
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-950 font-mono">
                {formatCurrency(audit.expectedBill)}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white border border-rose-100">
              <span className="text-[10px] font-bold uppercase text-rose-800 block mb-0.5">
                Actual
              </span>
              <span className="text-sm sm:text-base font-black text-rose-950 font-mono">
                {formatCurrency(audit.actualBill)}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white border border-amber-100">
              <span className="text-[10px] font-bold uppercase text-amber-800 block mb-0.5">
                Difference
              </span>
              <span className="text-sm sm:text-base font-black text-amber-950 font-mono">
                +₹{audit.difference}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Variance: <strong className="text-rose-700 font-bold">{audit.percentageDifference}% higher</strong> than APERC approved schedules for {audit.discom}.
          </div>

          {/* Action Buttons: Generate Complaint & Dismiss */}
          <div className="flex items-center gap-3 pt-1">
            <Link
              href={`/complaint?actual=${audit.actualBill}&expected=${audit.expectedBill}&diff=${audit.difference}&units=${audit.unitsConsumed}`}
              onClick={onDismiss}
              className="flex-1"
            >
              <button className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <span>Generate Complaint</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>

            <button
              onClick={onDismiss}
              className="py-3 px-5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
