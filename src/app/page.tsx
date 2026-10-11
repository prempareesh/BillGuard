"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Leaf,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  FileCheck,
} from "lucide-react";

import { useAppTranslation } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useAppTranslation();

  return (
    <div className="bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* HERO SECTION                                                             */}
      {/* ========================================================================= */}
      <section
        className="relative py-12 lg:py-16 w-full my-auto overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 65% at 65% 42%, rgba(34, 197, 94, 0.08) 0%, rgba(240, 253, 244, 0.3) 40%, #FFFFFF 85%), linear-gradient(180deg, #FFFFFF 0%, #FAFCFB 60%, #FFFFFF 100%)",
        }}
      >
        {/* Atmospheric Sunlight Glow Top-Right */}
        <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full pointer-events-none blur-[140px] -z-10 bg-amber-100/40" />

        {/* Ambient Subtle Green Glow Behind Illustration */}
        <div
          className="absolute right-[5%] lg:right-[14%] top-[16%] w-[620px] h-[620px] rounded-full pointer-events-none blur-[120px] -z-10"
          style={{ backgroundColor: "rgba(34, 197, 94, 0.16)" }}
        />

        {/* Floating Atmospheric Leaf Particles */}
        <motion.div
          animate={{
            y: [0, -12, 0],
            x: [0, 6, 0],
            rotate: [0, 15, 0],
          }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[44%] text-[#22C55E]/50 pointer-events-none z-20 hidden md:block"
        >
          <Leaf className="w-5 h-5 drop-shadow-xs" />
        </motion.div>

        <motion.div
          animate={{
            y: [0, 10, 0],
            x: [0, -6, 0],
            rotate: [0, -12, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute top-[48%] right-[10%] text-[#22C55E]/40 pointer-events-none z-20 hidden lg:block"
        >
          <Leaf className="w-4 h-4 drop-shadow-xs" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* ------------------------------------------------------------- */}
            {/* LEFT COLUMN: Clean Product Positioning                        */}
            {/* ------------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="lg:col-span-6 flex flex-col items-start text-left z-20 relative"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 mb-6 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                <Zap className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>{t("hero.badge", "APERC Statutory Compliance • Andhra Pradesh")}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-[#0F172A] tracking-tight leading-[1.12]">
                {t("hero.titleLine1", "Understand Your Electricity Bill.")}
                <br />
                <span className="text-[#0F172A]">{t("hero.titleLine2", "Detect Energy Waste.")}</span>
                <br />
                <span className="text-[#22C55E]">{t("hero.titleLine3", "Build a Cleaner Future.")}</span>
              </h1>

              {/* Short Description */}
              <p className="mt-5 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl">
                {t("hero.description", "BillGuard verifies Andhra Pradesh electricity bills against official regulatory tariff slabs, checks meter reading deltas, detects unauthorized overcharges, and generates CGRF dispute notices.")}
              </p>

              {/* Interactive CTA Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/audit"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-sm shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{t("hero.ctaAudit", "Audit My Bill")}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/audit?demo=true"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-sm border border-[#CBD5E1] shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <span>{t("hero.ctaDemo", "Try Sample Demo Bill")}</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 pt-6 border-t border-[#E2E8F0] flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span className="font-semibold text-slate-800">{t("hero.trustGazettes", "APERC Official Gazettes")}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span>{t("hero.trustDiscoms", "APSPDCL / APCPDCL / APEPDCL")}</span>
                </div>
                <span>•</span>
                <span>{t("hero.trustMath", "Deterministic Zero-AI Math")}</span>
              </div>
            </motion.div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT COLUMN: Seamlessly Blended Hero Visual                  */}
            {/* ------------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-6 w-full flex items-center justify-center relative"
            >
              {/* Floating Ambient Wrapper */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative w-full max-w-[560px] aspect-square flex items-center justify-center"
              >
                {/* Seamlessly blended illustration without hard borders or pasted card appearance */}
                <div
                  className="relative w-full h-full flex items-center justify-center"
                  style={{
                    maskImage: "radial-gradient(circle at center, rgba(0,0,0,1) 56%, rgba(0,0,0,0) 95%)",
                    WebkitMaskImage: "radial-gradient(circle at center, rgba(0,0,0,1) 56%, rgba(0,0,0,0) 95%)",
                  }}
                >
                  <Image
                    src="/hero-visual.jpg"
                    alt="BillGuard Clean Electricity Intelligence Ecosystem"
                    width={1024}
                    height={1024}
                    priority
                    className="w-full h-full object-cover object-center select-none"
                  />
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
}
