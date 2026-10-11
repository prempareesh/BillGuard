"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon?: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  isDemo?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendPositive = true,
  isDemo = true,
  className,
}) => {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {isDemo && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Demo Data
            </span>
          )}
          {Icon && (
            <div className="w-8 h-8 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#22C55E]">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="my-1">
        <div className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          {value}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-[#64748B]">
        <span>{subtext}</span>
        {trend && (
          <span
            className={cn(
              "font-medium px-1.5 py-0.5 rounded",
              trendPositive
                ? "text-emerald-700 bg-emerald-50"
                : "text-amber-700 bg-amber-50"
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
};
