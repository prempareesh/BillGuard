import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Database, EyeOff, FileText } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | BillGuard",
  description: "BillGuard electricity bill privacy and data protection principles under APERC and Indian digital personal data regulations.",
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Consumer Data Protection & Confidentiality</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500 font-mono">
            Last Updated: October 2026 • Version 1.2
          </p>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            BillGuard is an independent consumer electricity utility audit platform. We are committed to protecting consumer privacy and ensuring that your electricity bills, consumer identifiers, and financial data are handled with rigorous security and confidentiality.
          </p>
        </div>

        {/* Policy Content Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div className="space-y-3 flex-1 text-slate-700 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  1. Information We Collect
                </h2>
                <p>
                  When you upload an electricity statement for auditing, BillGuard processes the visual document solely to extract the billing parameters necessary for tariff compliance calculations:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Consumer Name, Service Connection Number, and Discom Identifier (APSPDCL, APCPDCL, APEPDCL).</li>
                  <li>Billing cycle dates, previous meter reading, present meter reading, and total units consumed (kWh).</li>
                  <li>Billed financial breakdown including Energy Charges, Fixed Charges, Electricity Duty, and FPPCA fuel surcharges.</li>
                </ul>
                <p className="text-xs text-slate-500">
                  Note: We do not collect Aadhaar numbers, bank account credentials, credit card details, or payment passcodes.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-3 flex-1 text-slate-700 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  2. Purpose & Use of Data
                </h2>
                <p>
                  Your information is processed strictly for the following statutory consumer advocacy functions:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Deterministic mathematical verification of retail tariff schedules approved by the Andhra Pradesh Electricity Regulatory Commission (APERC).</li>
                  <li>Detection of meter multiplication arithmetic discrepancies and unauthorized line surcharges.</li>
                  <li>Generation of formal Consumer Grievance Redressal Forum (CGRF) complaint memorandums upon your request.</li>
                  <li>Calculating consumer carbon emission impacts using the CEA/AP grid factor (0.82 kg CO₂/kWh).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-3 flex-1 text-slate-700 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  3. Zero Third-Party Monetization
                </h2>
                <p>
                  BillGuard operates with zero data monetization. We never sell, rent, license, or disclose your personal utility information or billing data to third-party advertisers, data brokers, or marketing networks.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-3 flex-1 text-slate-700 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  4. Storage, Encryption & Deletion Rights
                </h2>
                <p>
                  Documents and audit records are secured using standard AWS infrastructure:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Uploaded statements are saved in isolated Amazon S3 storage buckets with AES-256 server-side encryption.</li>
                  <li>Audit metadata is persisted in Amazon DynamoDB with encryption at rest.</li>
                  <li>Consumers retain unconditional rights to delete any audit record from their history at any time. Clicking &quot;Delete&quot; permanently removes the record and associated data from DynamoDB and storage.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="mt-8 p-6 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Have questions regarding data handling? Reach our privacy desk at{" "}
            <span className="font-mono font-semibold text-slate-900">privacy@billguard.org</span>
          </div>
          <Link
            href="/terms"
            className="text-[#22C55E] hover:underline font-semibold shrink-0"
          >
            Read Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
