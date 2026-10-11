import React from "react";
import Link from "next/link";
import { Scale, ArrowLeft, CheckCircle2, AlertTriangle, FileCode2, ShieldAlert } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | BillGuard",
  description: "Terms and conditions governing the use of the BillGuard electricity audit and dispute draft utility.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#22C55E] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-xs mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 mb-4">
            <Scale className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Statutory Compliance & Service Conditions</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-500 font-mono">
            Effective Date: October 2026 • Version 1.1
          </p>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Please read these terms carefully before utilizing the BillGuard electricity audit and dispute assistant. By accessing or uploading documents to BillGuard, you agree to comply with these terms.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div className="space-y-3 flex-1 text-slate-700 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  1. Nature of Service
                </h2>
                <p>
                  BillGuard provides automated computational auditing of electricity statements for consumers within Andhra Pradesh (APSPDCL, APCPDCL, APEPDCL). Auditing algorithms reflect published APERC tariff schedules. BillGuard is an independent consumer technology tool and does not act as an official representative or revenue agent of power distribution companies.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <FileCode2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-3 flex-1 text-slate-700 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  2. Tariff Calculation Model & Accuracy
                </h2>
                <p>
                  Audit calculations rely strictly on deterministic mathematics based on APERC Retail Supply Tariff Orders:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Telescopic domestic slab assessments (0–50, 51–100, 101–200, 201–225, 226–400, and 400+ units).</li>
                  <li>Official fixed charge schedules per connected load kilowatt (kW).</li>
                  <li>Electricity Duty applied at 6 paise (₹0.06) per unit consumed.</li>
                  <li>Approved Fuel and Power Purchase Cost Adjustment (FPPCA) charges.</li>
                </ul>
                <p>
                  Users may review and edit extracted figures before final calculations to ensure exact correspondence with original paper invoices.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-3 flex-1 text-slate-700 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  3. Grievance Redressal (CGRF) Templates
                </h2>
                <p>
                  Complaint drafts generated by BillGuard are prepared strictly for convenience in submitting grievances under the Consumer Grievance Redressal Forum (CGRF) guidelines. Submitting a dispute through BillGuard generates formal text formatted for postal, email, or in-person delivery to the relevant Divisional Engineer or CGRF office; consumers remain responsible for actual formal submission to their distribution licensee.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-slate-700" />
              </div>
              <div className="space-y-3 flex-1 text-slate-700 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  4. Disclaimer of Legal Counsel
                </h2>
                <p>
                  Information, audit summaries, and conversational responses provided by the AI Electricity Assistant do not constitute licensed legal or statutory utility counsel. For complex high-tension commercial dispute proceedings or writ petitions before judicial courts, consumers should seek qualified regulatory counsel.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 p-6 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Need assistance or have questions regarding these terms? Contact{" "}
            <span className="font-mono font-semibold text-slate-900">support@billguard.org</span>
          </div>
          <Link
            href="/privacy"
            className="text-[#22C55E] hover:underline font-semibold shrink-0"
          >
            Read Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
