"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  actionText,
  onAction,
  className,
}) => {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "relative flex flex-col p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-xs transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#22C55E]">
          <Icon className="w-6 h-6 stroke-[1.8]" />
        </div>
        {badge && (
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-[#0F172A] tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-sm text-[#64748B] leading-relaxed flex-grow">
        {description}
      </p>

      {actionText && (
        <button
          onClick={onAction}
          className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-[#22C55E] hover:text-[#16A34A] transition-colors cursor-pointer text-left"
        >
          {actionText} →
        </button>
      )}
    </motion.div>
  );
};
