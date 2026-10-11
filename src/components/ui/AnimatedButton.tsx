"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  withArrow?: boolean;
  children: React.ReactNode;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none group";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-6 py-3.5 gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-[#22C55E] text-white hover:bg-[#16A34A] border border-[#22C55E] shadow-sm",
    secondary:
      "bg-[#F8FAFC] text-[#0F172A] hover:bg-[#F1F5F9] border border-[#E2E8F0] shadow-sm",
    outline:
      "bg-white text-[#0F172A] hover:bg-[#F8FAFC] border border-[#CBD5E1] shadow-xs",
    ghost:
      "bg-transparent text-[#0F172A] hover:bg-[#F8FAFC] border border-transparent",
    danger:
      "bg-[#EF4444] text-white hover:bg-[#DC2626] border border-[#EF4444] shadow-sm",
  };

  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.08)" }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      <span>{children}</span>
      {withArrow && (
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
      )}
    </motion.button>
  );
};
