"use client";

import React from "react";
import Link from "next/link";
import { Zap, ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
          
          {/* Logo & Tagline */}
          <div className="space-y-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#22C55E] text-white flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="text-base font-bold tracking-tight text-[#0F172A]">
                BillGuard
              </span>
            </Link>
            <p className="text-xs text-[#64748B]">
              Verify. Understand. Save. — Official Tariff Slabs & Billing Audit Platform.
            </p>
          </div>

          {/* Legal & Policy Links */}
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-[#0F172A]">
            <Link href="/privacy" className="hover:text-[#22C55E] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#22C55E] transition-colors">
              Terms of Service
            </Link>
          </div>

        </div>

        {/* Regulatory & Integrity Disclaimer */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-[#64748B]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Deterministic mathematical verification based on published Electricity Regulatory Commission tariffs.</span>
          </div>
          <div>© 2026 BillGuard. All rights reserved.</div>
        </div>

      </div>
    </footer>
  );
};
