import React from "react";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export interface EnergyBadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "neutral" | "demo";
  withDot?: boolean;
  withZap?: boolean;
  className?: string;
}

export const EnergyBadge: React.FC<EnergyBadgeProps> = ({
  children,
  variant = "success",
  withDot = false,
  withZap = false,
  className,
}) => {
  const variantStyles = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-rose-50 text-rose-800 border-rose-200",
    neutral: "bg-slate-50 text-slate-700 border-slate-200",
    demo: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    neutral: "bg-slate-400",
    demo: "bg-blue-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border tracking-wide",
        variantStyles[variant],
        className
      )}
    >
      {withZap && <Zap className="w-3 h-3 fill-current opacity-80" />}
      {withDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full inline-block animate-pulse", dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};
