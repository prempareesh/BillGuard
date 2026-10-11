"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Zap,
  Edit3,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Shield,
  FileCheck,
  Clock,
} from "lucide-react";
import {
  useProfileStore,
  ConsumerProfile,
  EMPTY_PROFILE,
  getProfileInitials,
  validateProfile,
} from "@/lib/profileStore";
import { useAuditStore } from "@/lib/auditStore";
import { useAppTranslation } from "@/lib/i18n";

export default function ProfilePage() {
  const { t } = useAppTranslation();
  const { profile, saveProfile, clearProfile, loadFromStorage } = useProfileStore();
  const { extractedData, auditResult } = useAuditStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ConsumerProfile>(EMPTY_PROFILE);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ConsumerProfile, string>>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load saved profile on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleStartEdit = () => {
    setFormData(profile);
    setFormErrors({});
    setGeneralError(null);
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(profile);
    setFormErrors({});
    setGeneralError(null);
    setIsEditing(false);
  };

  const handleFieldChange = (field: keyof ConsumerProfile, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field as the user types
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = validateProfile(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setGeneralError("Please review the highlighted errors before saving.");
      return;
    }

    const result = saveProfile(formData);
    if (result.success) {
      setIsEditing(false);
      setSaveSuccess(true);
      setFormErrors({});
      // Auto-hide success banner after 4 seconds
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      if (result.errors) {
        setFormErrors(result.errors);
      }
      setGeneralError("Could not save profile changes. Please try again.");
    }
  };

  // Determine current display initials dynamically from form or saved profile
  const activeName = isEditing ? formData.fullName : profile.fullName;
  const displayInitials = getProfileInitials(activeName || extractedData.consumerName);
  const hasProfileData = Boolean(
    profile.fullName ||
    profile.email ||
    profile.phone ||
    profile.serviceNumber ||
    profile.discom
  );

  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] py-8 lg:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {t("profile.badge", "Consumer Profile • Local Preferences")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {t("profile.title", "Consumer Profile")}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {t(
                "profile.subtitle",
                "Manage your consumer credentials and contact details. Stored securely on your device to streamline audits and dispute submissions."
              )}
            </p>
          </div>

          {/* Action Button: Edit or Save/Cancel */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{hasProfileData ? "Edit Profile" : "Create Profile"}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Alerts / Feedback Banners */}
        {saveSuccess && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1 font-medium">
              Profile information saved successfully on this device.
            </div>
            <button
              onClick={() => setSaveSuccess(false)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {generalError && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <div className="flex-1 font-medium">{generalError}</div>
            <button
              onClick={() => setGeneralError(null)}
              className="text-red-700 hover:text-red-900 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Profile Identity Card */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Circular Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold tracking-tight shadow-md border-2 border-emerald-500">
                {displayInitials}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                title="Active Profile"
              >
                <Zap className="w-3 h-3 fill-current" />
              </div>
            </div>

            {/* Identity Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[#0F172A] truncate">
                  {activeName || (
                    <span className="text-slate-400 font-normal italic">
                      No Name Set
                    </span>
                  )}
                </h2>
                {profile.discom && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {profile.discom}
                  </span>
                )}
                {profile.consumerCategory && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {profile.consumerCategory}
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {profile.email || <span className="italic text-slate-400">No email registered</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {profile.phone || <span className="italic text-slate-400">No phone registered</span>}
                </span>
              </div>

              {profile.updatedAt && (
                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Last updated on {new Date(profile.updatedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content: Form or View Card */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Personal Details */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Personal & Contact Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange("fullName", e.target.value)}
                    placeholder="e.g., K. Raghunath Reddy"
                    className={`w-full text-xs px-3 py-2 rounded-lg border ${
                      formErrors.fullName
                        ? "border-red-400 focus:border-red-500 bg-red-50/30"
                        : "border-[#CBD5E1] focus:border-emerald-500"
                    } outline-none transition-colors text-[#0F172A]`}
                  />
                  {formErrors.fullName && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.fullName}</p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    placeholder="consumer@example.com"
                    className={`w-full text-xs px-3 py-2 rounded-lg border ${
                      formErrors.email
                        ? "border-red-400 focus:border-red-500 bg-red-50/30"
                        : "border-[#CBD5E1] focus:border-emerald-500"
                    } outline-none transition-colors text-[#0F172A]`}
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Mobile Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    placeholder="e.g., 9848012345"
                    maxLength={10}
                    className={`w-full text-xs px-3 py-2 rounded-lg border ${
                      formErrors.phone
                        ? "border-red-400 focus:border-red-500 bg-red-50/30"
                        : "border-[#CBD5E1] focus:border-emerald-500"
                    } outline-none transition-colors text-[#0F172A]`}
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Electricity Connection Details */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Electricity Connection Details (Andhra Pradesh)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Distribution Utility (DISCOM) */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Distribution Utility (DISCOM)
                  </label>
                  <select
                    value={formData.discom}
                    onChange={(e) => handleFieldChange("discom", e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:border-emerald-500 outline-none transition-colors"
                  >
                    <option value="">Select Distribution Area / DISCOM</option>
                    <option value="APSPDCL">APSPDCL (Southern Power — Tirupati, Nellore, Kadapa, etc.)</option>
                    <option value="APCPDCL">APCPDCL (Central Power — Vijayawada, Guntur, Ongole, etc.)</option>
                    <option value="APEPDCL">APEPDCL (Eastern Power — Visakhapatnam, Rajahmundry, etc.)</option>
                  </select>
                </div>

                {/* Consumer Category */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Consumer Category
                  </label>
                  <select
                    value={formData.consumerCategory}
                    onChange={(e) => handleFieldChange("consumerCategory", e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:border-emerald-500 outline-none transition-colors"
                  >
                    <option value="">Select Consumer Category</option>
                    <option value="Domestic">LT-I Domestic (Residential Households)</option>
                    <option value="Commercial">LT-II Non-Domestic / Commercial</option>
                  </select>
                </div>

                {/* Service Connection Number (USC) */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Service Connection Number (USC)
                  </label>
                  <input
                    type="text"
                    value={formData.serviceNumber}
                    onChange={(e) => handleFieldChange("serviceNumber", e.target.value)}
                    placeholder="e.g., NEL-04-12948"
                    className={`w-full text-xs px-3 py-2 rounded-lg border ${
                      formErrors.serviceNumber
                        ? "border-red-400 focus:border-red-500 bg-red-50/30"
                        : "border-[#CBD5E1] focus:border-emerald-500"
                    } outline-none transition-colors text-[#0F172A]`}
                  />
                  {formErrors.serviceNumber && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.serviceNumber}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">Found on the top of your physical or digital statement.</p>
                </div>

                {/* Consumer Account Number */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Consumer Account Number (A/C No.)
                  </label>
                  <input
                    type="text"
                    value={formData.consumerNumber}
                    onChange={(e) => handleFieldChange("consumerNumber", e.target.value)}
                    placeholder="e.g., 1429810342"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#CBD5E1] focus:border-emerald-500 outline-none transition-colors text-[#0F172A]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Unique 10-digit utility billing identifier.</p>
                </div>

                {/* Distribution Section / Town */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Distribution Section / Circle / Area
                  </label>
                  <input
                    type="text"
                    value={formData.distributionSection}
                    onChange={(e) => handleFieldChange("distributionSection", e.target.value)}
                    placeholder="e.g., Nellore Town Section, Sri City Circle, Tirupati Urban"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#CBD5E1] focus:border-emerald-500 outline-none transition-colors text-[#0F172A]"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* View Mode: Details Grid */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Registered Consumer Details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  Edit Details
                </button>
              </div>

              {!hasProfileData ? (
                /* Sensible Empty State */
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">No consumer profile saved yet</h4>
                    <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1">
                      Save your name and electricity service number to automatically autofill your bill audits and CGRF complaint letters.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Set Up Profile</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-[#64748B] block">Full Name</span>
                    <span className="text-xs font-bold text-[#0F172A] mt-0.5 block">
                      {profile.fullName || <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-[#64748B] block">Email Address</span>
                    <span className="text-xs font-semibold text-[#0F172A] mt-0.5 block truncate">
                      {profile.email || <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-[#64748B] block">Phone Number</span>
                    <span className="text-xs font-semibold text-[#0F172A] mt-0.5 block">
                      {profile.phone ? `+91 ${profile.phone}` : <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>

                  {/* DISCOM */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-[#64748B] block">Electricity Utility (DISCOM)</span>
                    <span className="text-xs font-bold text-[#0F172A] mt-0.5 block">
                      {profile.discom || <span className="text-slate-400 italic">Not selected</span>}
                    </span>
                  </div>

                  {/* Service Number */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-[#64748B] block">Service Connection (USC No.)</span>
                    <span className="text-xs font-mono font-bold text-[#0F172A] mt-0.5 block">
                      {profile.serviceNumber || <span className="text-slate-400 italic font-sans">Not provided</span>}
                    </span>
                  </div>

                  {/* Consumer Account Number */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-[#64748B] block">Consumer Account Number</span>
                    <span className="text-xs font-mono font-bold text-[#0F172A] mt-0.5 block">
                      {profile.consumerNumber || <span className="text-slate-400 italic font-sans">Not provided</span>}
                    </span>
                  </div>

                  {/* Consumer Category */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-[#64748B] block">Tariff Category</span>
                    <span className="text-xs font-semibold text-[#0F172A] mt-0.5 block">
                      {profile.consumerCategory ? `LT-I ${profile.consumerCategory}` : <span className="text-slate-400 italic">Not selected</span>}
                    </span>
                  </div>

                  {/* Distribution Section */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-[#64748B] block">Distribution Section / Circle</span>
                    <span className="text-xs font-semibold text-[#0F172A] mt-0.5 block">
                      {profile.distributionSection || <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions & Privacy Transparency Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Linked Audit Status */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-[#0F172A]">Active Bill Audit</h4>
                </div>
                {auditResult ? (
                  <div className="space-y-1.5 text-xs text-[#64748B]">
                    <div className="flex justify-between">
                      <span>Audited DISCOM:</span>
                      <span className="font-semibold text-[#0F172A]">{auditResult.discom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Billed Amount:</span>
                      <span className="font-semibold text-[#0F172A]">₹{auditResult.actualBill}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>APERC Status:</span>
                      <span className="font-bold text-emerald-600">{auditResult.status}</span>
                    </div>
                    <Link
                      href="/audit"
                      className="inline-block mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      View Full Audit →
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B]">
                    No active bill currently loaded in this session.{" "}
                    <Link href="/audit" className="text-emerald-600 font-bold hover:underline">
                      Audit a bill now
                    </Link>
                  </p>
                )}
              </div>

              {/* Local Storage Transparency */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-[#0F172A]">Local Device Storage</h4>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  BillGuard operates without user passwords or centralized account databases. Your profile data is stored locally in your browser cache to auto-fill audits. No passwords, credentials, or billing bank accounts are ever collected or stored.
                </p>
                {hasProfileData && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to clear your locally stored profile data?")) {
                          clearProfile();
                        }
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      Clear Saved Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
