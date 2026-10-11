"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Check,
} from "lucide-react";
import { ExtractedBillData, OCRValidationState, FieldValidationStatus } from "@/lib/auditStore";
import { APDiscom, APConsumerCategory } from "@/lib/apTariffEngine";

interface EditableBillFieldsProps {
  data: ExtractedBillData;
  validation: OCRValidationState;
  onFieldChange: <K extends keyof ExtractedBillData>(
    field: K,
    value: ExtractedBillData[K]
  ) => void;
  onConfirm?: () => void;
}

export const EditableBillFields: React.FC<EditableBillFieldsProps> = ({
  data,
  validation,
  onFieldChange,
  onConfirm,
}) => {
  const [isExpanded, setIsExpanded] = useState(validation.isNeedsReview);
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const handleFieldChangeInternal = <K extends keyof ExtractedBillData>(
    field: K,
    value: ExtractedBillData[K]
  ) => {
    setEditedFields((prev) => new Set(prev).add(String(field)));
    onFieldChange(field, value);
  };

  const getStatusBadge = (status: FieldValidationStatus, fieldKey?: string) => {
    if (fieldKey && editedFields.has(fieldKey)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
          <Check className="w-2.5 h-2.5 text-blue-600" />
          User Corrected
        </span>
      );
    }

    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            Verified (OCR)
          </span>
        );
      case "Needs Review":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
            Needs Review
          </span>
        );
      case "Missing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-2.5 h-2.5 text-red-600" />
            Missing
          </span>
        );
      case "Corrected by User":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
            <Check className="w-2.5 h-2.5 text-blue-600" />
            User Corrected
          </span>
        );
    }
  };

  // Meter Reading Reconciliation Calculation
  const hasMeterReadings =
    data.currentReading > 0 && data.previousReading >= 0 && data.currentReading >= data.previousReading;
  const meterDelta = hasMeterReadings ? data.currentReading - data.previousReading : null;
  const isMeterReconciled =
    meterDelta !== null ? Math.abs(meterDelta - data.unitsConsumed) <= 2 : null;

  return (
    <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden text-left">
      {/* Header bar - Clickable Accordion Toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between border-b border-slate-100 bg-[#F8FAFC]/70 hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                OCR Validation Layer & Extracted Parameters
              </h3>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                  validation.reliability === "High"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : validation.reliability === "Medium"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                Audit Reliability: {validation.reliability}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Field-by-field verification of scanned electricity statement
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title={isExpanded ? "Collapse fields" : "Expand fields"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Field Validation Summary Pill Row */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-[11px] font-semibold text-slate-500">Field Status:</span>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-600">Consumer No:</span>
          {getStatusBadge(validation.consumerNumber)}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-600">Units:</span>
          {getStatusBadge(validation.units)}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-600">Bill Amount:</span>
          {getStatusBadge(validation.billAmount)}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-600">Billing Date:</span>
          {getStatusBadge(validation.billingDate)}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-600">Category:</span>
          {getStatusBadge(validation.tariffCategory)}
        </div>
      </div>

      {/* Meter Reading Validation Banner */}
      {hasMeterReadings && (
        <div
          className={`px-4 py-2 text-xs border-b flex items-center gap-2 ${
            isMeterReconciled
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          {isMeterReconciled ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span className="font-mono text-[11px]">
            {isMeterReconciled
              ? `Meter readings reconciled: Current (${data.currentReading}) - Previous (${data.previousReading}) = ${meterDelta} kWh matches statement units.`
              : `Meter difference (${meterDelta} kWh) differs from entered units (${data.unitsConsumed} kWh). Please verify.`}
          </span>
        </div>
      )}

      {/* Low Confidence / Needs Review Warning Banner */}
      {validation.isNeedsReview && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold text-[11px]">
              Please verify extracted information before audit. One or more fields require confirmation.
            </span>
          </div>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[10px] transition-colors cursor-pointer shrink-0"
            >
              Confirm Values
            </button>
          )}
        </div>
      )}

      {/* Editable Form Fields */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Row 1: Consumer Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#0F172A]">
                  Consumer Name
                </label>
                {getStatusBadge("Verified", "consumerName")}
              </div>
              <input
                type="text"
                value={data.consumerName}
                onChange={(e) => handleFieldChangeInternal("consumerName", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#0F172A]">
                  Consumer Account No
                </label>
                {getStatusBadge(validation.consumerNumber, "consumerNumber")}
              </div>
              <input
                type="text"
                value={data.consumerNumber}
                onChange={(e) => handleFieldChangeInternal("consumerNumber", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#0F172A]">
                  Service Number (USC)
                </label>
                {getStatusBadge("Verified", "serviceNumber")}
              </div>
              <input
                type="text"
                value={data.serviceNumber}
                onChange={(e) => handleFieldChangeInternal("serviceNumber", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: DISCOM & Category & Month & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                DISCOM
              </label>
              <select
                value={data.discom}
                onChange={(e) =>
                  handleFieldChangeInternal("discom", e.target.value as APDiscom)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              >
                <option value="APSPDCL">APSPDCL (Southern Power)</option>
                <option value="APCPDCL">APCPDCL (Central Power)</option>
                <option value="APEPDCL">APEPDCL (Eastern Power)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#0F172A]">
                  Tariff Category
                </label>
                {getStatusBadge(validation.tariffCategory, "consumerCategory")}
              </div>
              <select
                value={data.consumerCategory}
                onChange={(e) =>
                  handleFieldChangeInternal(
                    "consumerCategory",
                    e.target.value as APConsumerCategory
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              >
                <option value="Domestic">LT-I Domestic (Household)</option>
                <option value="Commercial">LT-II Commercial</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#0F172A]">
                  Billing Month / Date
                </label>
                {getStatusBadge(validation.billingDate, "billingMonth")}
              </div>
              <input
                type="text"
                value={data.billingMonth}
                onChange={(e) => handleFieldChangeInternal("billingMonth", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Due Date
              </label>
              <input
                type="text"
                value={data.dueDate || ""}
                placeholder="DD-MM-YYYY"
                onChange={(e) => handleFieldChangeInternal("dueDate", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Readings & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Previous Meter Reading
              </label>
              <input
                type="number"
                value={data.previousReading}
                onChange={(e) =>
                  handleFieldChangeInternal("previousReading", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Current Meter Reading
              </label>
              <input
                type="number"
                value={data.currentReading}
                onChange={(e) =>
                  handleFieldChangeInternal("currentReading", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#0F172A]">
                  Units Consumed (kWh)
                </label>
                {getStatusBadge(validation.units, "unitsConsumed")}
              </div>
              <input
                type="number"
                value={data.unitsConsumed}
                onChange={(e) =>
                  handleFieldChangeInternal("unitsConsumed", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-emerald-400 bg-emerald-50/20 font-bold font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Financial Charges */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#0F172A]">
                  Billed Statement Total (₹)
                </label>
                {getStatusBadge(validation.billAmount, "billAmount")}
              </div>
              <input
                type="number"
                value={data.billAmount}
                onChange={(e) =>
                  handleFieldChangeInternal("billAmount", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/20 font-bold font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Fixed Charges (₹)
              </label>
              <input
                type="number"
                value={data.fixedCharges}
                onChange={(e) =>
                  handleFieldChangeInternal("fixedCharges", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                FPPCA Fuel Surcharge (₹)
              </label>
              <input
                type="number"
                value={data.fuelAdjustmentCharges}
                onChange={(e) =>
                  handleFieldChangeInternal(
                    "fuelAdjustmentCharges",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Electricity Duty (₹)
              </label>
              <input
                type="number"
                value={data.taxes}
                onChange={(e) =>
                  handleFieldChangeInternal("taxes", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono text-[#0F172A] focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
              />
            </div>
          </div>

          {onConfirm && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Confirm Parameters & Re-calculate Audit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
