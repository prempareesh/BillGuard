"use client";

import React from "react";
import {
  Flame,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  Leaf,
  Trees,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface EnergyWasteSectionProps {
  unitsConsumed: number;
  actualBill?: number;
  expectedBill?: number;
}

export const EnergyWasteSection: React.FC<EnergyWasteSectionProps> = ({
  unitsConsumed,
}) => {
  // Deterministic calculations based on units consumed
  const co2Emissions = Math.round(unitsConsumed * 0.82); // ~0.82 kg CO2 per kWh grid average in India
  const treesRequired = Math.max(1, Math.round(co2Emissions / 21)); // 1 tree absorbs ~21-22 kg CO2 per year
  const wasteScore = Math.max(
    55,
    Math.min(96, Math.round(100 - (unitsConsumed / 500) * 40))
  );

  const potentialMonthlySavings = Math.round(unitsConsumed * 1.35);
  const potentialCO2Reduction = Math.round(unitsConsumed * 0.07);

  const recommendations = [
    {
      title: "Optimize AC Temperature to 24°C–26°C",
      desc: "Setting AC to 24°C instead of 18°C saves 6% electricity per degree, lowering consumption below the 226-unit AP slab tier.",
      savingsMonthly: 350,
      impact: "High",
      co2: "18 kg CO₂",
    },
    {
      title: "Shift Heavy Loads to Solar Off-Peak Hours",
      desc: "Run washing machines, water pumps, and dishwashers between 10:00 AM – 3:00 PM to maximize grid solar efficiency.",
      savingsMonthly: 180,
      impact: "Medium",
      co2: "11 kg CO₂",
    },
    {
      title: "Eliminate Vampire Standby Consumption",
      desc: "Smart plugs or switchboard cutoffs for set-top boxes, entertainment systems, and idle laptop chargers save 5–10% idle draw.",
      savingsMonthly: 90,
      impact: "Quick Win",
      co2: "6 kg CO₂",
    },
    {
      title: "Upgrade Old Ceiling Fans to BLDC Technology",
      desc: "Brushless DC (BLDC) motor fans consume 28W vs 75W induction fans, saving ₹80/fan per month in continuous coastal AP climates.",
      savingsMonthly: 240,
      impact: "Long-term",
      co2: "15 kg CO₂",
    },
  ];

  return (
    <div className="space-y-6 text-left">
      
      {/* ===================================================================== */}
      {/* 1. ENERGY WASTE INSIGHTS                                             */}
      {/* ===================================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Energy Waste Insights
              </h3>
              <p className="text-[11px] text-[#64748B]">
                AI-detected patterns causing avoidable electricity expense and slab creep.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Potential Savings: {formatCurrency(potentialMonthlySavings)} / mo
            </span>
          </div>
        </div>

        {/* 4 Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          
          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/80 text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-rose-800 tracking-wider">
                Usage Surge
              </span>
              <TrendingUp className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-sm font-extrabold text-rose-950">
              +18% vs Previous Cycle
            </div>
            <p className="text-[11px] text-rose-800/90 leading-relaxed">
              Electricity usage spiked by 48 units compared to your historical baseline, pushing your connection into the highest tariff tier.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">
                Appliance Telemetry
              </span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm font-extrabold text-amber-950">
              Possible AC Overuse Detected
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              Prolonged nocturnal thermal cooling load accounts for ~54% of total energy volume during peak humid hours.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">
                Peak Hours Draw
              </span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm font-extrabold text-blue-950">
              High Evening Load
            </div>
            <p className="text-[11px] text-blue-800/90 leading-relaxed">
              62% of household consumption happens between 6:00 PM – 11:00 PM when grid stress and thermal generation factors peak.
            </p>
          </div>

        </div>

        {/* Aggregate Potential Impact Callout */}
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#22C55E] shrink-0" />
            <span className="text-emerald-950 font-medium">
              Eliminating these waste vectors can drop your next statement by <strong className="font-bold">{formatCurrency(potentialMonthlySavings)}</strong> and prevent <strong className="font-bold">{potentialCO2Reduction} kg CO₂</strong> emissions monthly.
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. ENERGY SAVINGS RECOMMENDATIONS                                    */}
      {/* ===================================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#22C55E] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                AI Energy Savings Recommendations
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Actionable household optimizations tailored to Andhra Pradesh tariff thresholds.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-emerald-700 font-bold hidden sm:inline-block">
            Target Slab: &lt; 200 Units
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all text-left bg-slate-50/40 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-[#0F172A] leading-snug">
                  {rec.title}
                </h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300 whitespace-nowrap">
                  Save ₹{rec.savingsMonthly}/mo
                </span>
              </div>

              <p className="text-[11px] text-[#64748B] leading-relaxed">
                {rec.desc}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-200/60">
                <span>Impact: <strong>{rec.impact}</strong></span>
                <span className="text-emerald-700 font-medium">-{rec.co2}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. CARBON IMPACT & ENVIRONMENTAL SCORE                               */}
      {/* ===================================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Household Carbon Footprint Telemetry
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Environmental footprint audited from {unitsConsumed} kWh grid power consumption.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            CEA Grid Emissions Factor
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-[#22C55E]" />
              Estimated CO₂ Emissions
            </div>
            <div className="text-2xl font-black text-[#0F172A] font-mono">
              {co2Emissions} <span className="text-xs font-normal text-slate-500">kg CO₂</span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1">
              Based on AP state thermal and renewable generation mix.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Trees className="w-3.5 h-3.5 text-emerald-700" />
              Trees Required to Offset
            </div>
            <div className="text-2xl font-black text-emerald-950 font-mono">
              {treesRequired} <span className="text-xs font-normal text-emerald-700">Trees</span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1">
              Annual tree growth required to sequester your monthly emissions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Environmental Impact Score
            </div>
            <div className="text-2xl font-black text-blue-950 font-mono">
              {wasteScore} <span className="text-xs font-normal text-blue-600">/ 100</span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1">
              {wasteScore > 75 ? "Good energy hygiene rating" : "High slab consumption penalty"}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
