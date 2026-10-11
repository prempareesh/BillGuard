import React from "react";
import { cn } from "@/lib/utils";
import { EnergyBadge } from "./EnergyBadge";

export interface SectionHeadingProps {
  badge?: string;
  badgeVariant?: "success" | "warning" | "neutral" | "demo";
  title: string;
  highlight?: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  badge,
  badgeVariant = "success",
  title,
  highlight,
  description,
  align = "center",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col mb-12",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {badge && (
        <div className="mb-3">
          <EnergyBadge variant={badgeVariant} withZap>
            {badge}
          </EnergyBadge>
        </div>
      )}

      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight leading-tight max-w-3xl text-balance">
        {highlight && title.includes(highlight) ? (
          <>
            {title.split(highlight)[0]}
            <span className="text-[#22C55E] relative inline-block underline decoration-emerald-300 decoration-wavy decoration-2 underline-offset-6">
              {highlight}
            </span>
            {title.split(highlight)[1]}
          </>
        ) : (
          title
        )}
      </h2>

      {description && (
        <p className="mt-4 text-base sm:text-lg text-[#64748B] max-w-2xl text-balance leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};
