"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  ChevronDown,
  Globe,
  Menu,
  X,
  FileCheck,
  LayoutDashboard,
  History,
  FileText,
  Leaf,
  Home,
  User,
} from "lucide-react";
import { useAppTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuditStore } from "@/lib/auditStore";
import { useProfileStore, getProfileInitials } from "@/lib/profileStore";

const emptySubscribe = () => () => {};

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { setLanguage, extractedData, auditResult } = useAuditStore();
  const { profile, loadFromStorage } = useProfileStore();
  const { t, activeLanguage } = useAppTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const navLinks = [
    { href: "/", label: t("nav.home", "Home"), icon: Home },
    { href: "/audit", label: t("nav.audit", "Audit Bill"), icon: FileCheck },
    { href: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard },
    { href: "/history", label: t("nav.history", "Bill History"), icon: History },
    { href: "/complaint", label: t("nav.complaint", "Complaint"), icon: FileText },
    { href: "/impact", label: t("nav.impact", "Carbon Impact"), icon: Leaf },
    { href: "/profile", label: t("nav.profile", "Profile"), icon: User },
  ];

  const currentLangLabel =
    activeLanguage === "te"
      ? "తెలుగు"
      : activeLanguage === "hi"
      ? "हिन्दी"
      : "English";

  const activeConsumerName = mounted ? (profile.fullName || extractedData.consumerName) : extractedData.consumerName;
  const displayInitials = getProfileInitials(activeConsumerName);
  const displayName = activeConsumerName || "Consumer Portal";

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center shadow-xs">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0F172A]">
            BillGuard
          </span>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors",
                  isActive
                    ? "text-[#22C55E] bg-emerald-50 font-bold"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Language Selector and User Profile */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>{currentLangLabel}</span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {langOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg border border-[#E2E8F0] shadow-md py-1 z-50 text-xs">
                {[
                  { id: "en", label: "English" },
                  { id: "te", label: "తెలుగు (Telugu)" },
                  { id: "hi", label: "हिन्दी (Hindi)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setLanguage(item.id as "en" | "te" | "hi");
                      setLangOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors",
                      activeLanguage === item.id ? "text-[#22C55E] font-bold bg-emerald-50/50" : "text-[#0F172A]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Consumer Portal Profile Link */}
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-2 pl-2 border-l border-slate-200 group transition-opacity",
              pathname === "/profile" ? "opacity-100" : "hover:opacity-85"
            )}
            title={t("nav.profile", "Consumer Profile")}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-xs transition-all",
                pathname === "/profile"
                  ? "bg-emerald-600 ring-2 ring-emerald-400 ring-offset-1"
                  : "bg-slate-900 group-hover:bg-slate-800"
              )}
            >
              {displayInitials}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span
                className={cn(
                  "text-xs font-bold leading-tight transition-colors",
                  pathname === "/profile" ? "text-[#22C55E]" : "text-[#0F172A] group-hover:text-emerald-600"
                )}
              >
                {displayName}
              </span>
              <span className="text-[10px] text-[#64748B]">
                {profile.discom
                  ? `${profile.discom} • Saved`
                  : auditResult
                  ? `${auditResult.discom} • Audited`
                  : "APERC Verified"}
              </span>
            </div>
          </Link>

        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-[#E2E8F0] text-[#0F172A]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-2 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "block px-3 py-2 rounded-lg text-xs font-semibold",
                pathname === link.href
                  ? "bg-emerald-50 text-[#22C55E]"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Language:</span>
            <div className="flex gap-1.5">
              {(["en", "te", "hi"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium border",
                    activeLanguage === lang
                      ? "border-[#22C55E] bg-emerald-50 text-[#22C55E] font-bold"
                      : "border-slate-200 text-slate-600"
                  )}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
