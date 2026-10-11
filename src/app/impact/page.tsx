"use client";

import React from "react";
import Link from "next/link";
import { Leaf, FileCheck } from "lucide-react";
import { useAuditStore } from "@/lib/auditStore";
import { useAppTranslation } from "@/lib/i18n";

export default function EnvironmentalInsightPage() {
  const { auditResult, historyList } = useAuditStore();
  const { t } = useAppTranslation();

  // Carbon Impact rule: Use explicitly active audit, or fallback to most recent saved audit
  const units =
    auditResult?.unitsConsumed ||
    (historyList.length > 0 ? Number(historyList[0].unitsConsumed ?? 0) : 0);

  // If no audit exists at all, show strictly specified empty notice
  if (!units || units <= 0) {
    return (
      <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-8 sm:p-10 shadow-2xs space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-lg font-bold text-[#0F172A]">
              {t("impactPage.noDataTitle", "No statement data available")}
            </h1>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              {t("impactPage.noDataDesc", "Audit an electricity bill to see an estimated carbon footprint based on your electricity consumption.")}
            </p>
            <div className="pt-2">
              <Link
                href="/audit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>{t("impactPage.auditMyBill", "Audit My Bill")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Real calculations only: 0.82 kg CO2 per kWh grid factor in AP; 1 tree sequesters ~21 kg CO2/year
  const co2Monthly = Math.round(units * 0.82);
  const treesNeeded = Math.max(1, Math.round(co2Monthly / 21));

  const practicalTip =
    units > 225
      ? `Your usage of ${units} units reached the ₹8.75/unit tier. Setting your AC thermostat to 24°C reduces draw by ~6% per degree, keeping consumption within lower tariff slabs.`
      : `Maintaining your AC thermostat at 24°C and scheduling heavy loads during daylight solar hours (10:00 AM – 3:00 PM) keeps your household within baseline consumption tiers.`;

  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-8 lg:py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-600" />
                Consumption Telemetry
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Environmental Insight
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Direct carbon telemetry based on your audited {units} kWh grid power consumption.
            </p>
          </div>

          <Link
            href="/audit"
            className="self-start sm:self-auto px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Audit New Bill</span>
          </Link>
        </div>

        {/* The 2 Core Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Estimated Monthly CO2 */}
          <div className="bg-white p-5 rounded-xl border border-[#CBD5E1] shadow-2xs text-left">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Estimated Monthly CO₂
            </span>
            <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
              {co2Monthly} kg CO₂
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Calculated as {units} kWh × 0.82 kg/kWh (Andhra Pradesh grid factor)
            </span>
          </div>

          {/* Equivalent Trees Required */}
          <div className="bg-white p-5 rounded-xl border border-[#CBD5E1] shadow-2xs text-left">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Equivalent Trees Required
            </span>
            <div className="text-3xl font-bold font-mono text-emerald-700 tracking-tight">
              {treesNeeded} Trees
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Based on standard 21 kg annual CO₂ sequestration per mature tree
            </span>
          </div>

        </div>

        {/* One Practical Energy-Saving Tip */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-5 shadow-2xs text-left space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
            Practical Energy-Saving Tip
          </span>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {practicalTip}
          </p>
        </div>

      </div>
    </div>
  );
}
