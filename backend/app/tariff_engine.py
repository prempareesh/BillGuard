"""
Andhra Pradesh Electricity Regulatory Commission (APERC) Tariff Engine
100% Deterministic, Explainable, Traceable Mathematical Engine.
Supports DISCOMs: APSPDCL, APCPDCL, APEPDCL.
Versioned against official APERC Retail Supply Tariff Orders.
"""

import re
import time
import datetime
from typing import List, Dict, Any, Optional, Tuple
from .schemas import (
    TariffAuditRequest,
    TariffAuditResponse,
    SlabCalculationItem,
    APDiscom,
    APConsumerCategory,
)

AP_DISCOMS_INFO: Dict[str, Dict[str, str]] = {
    "APSPDCL": {
        "name": "Southern Power Distribution Company of AP Ltd",
        "region": "Tirupati, Nellore, Kadapa, Chittoor, Anantapur",
    },
    "APCPDCL": {
        "name": "Central Power Distribution Company of AP Ltd",
        "region": "Vijayawada, Guntur, Krishna, Prakasam",
    },
    "APEPDCL": {
        "name": "Eastern Power Distribution Company of AP Ltd",
        "region": "Visakhapatnam, Srikakulam, Vizianagaram, Godavari",
    },
}

# Versioned APERC Retail Tariff Schedules
TARIFF_SCHEDULE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "APERC-TO-2026-27": {
        "version": "APERC-TO-2026-27",
        "order_name": "APERC Retail Supply Tariff Order FY 2026–27",
        "financial_year": "2026-27",
        "effective_from": "2026-04-01",
        "effective_to": "2027-03-31",
        "is_official_gazetted": True,
        "citation": "APERC Retail Supply Tariff Order FY 2026-27 (Maintained FY 2025-26 tariff with zero tariff revision)",
        "domestic_telescopic_slabs": [
            {"min": 0, "max": 30, "rate": 1.90, "label": "0 – 30 units"},
            {"min": 31, "max": 75, "rate": 3.00, "label": "31 – 75 units"},
            {"min": 76, "max": 125, "rate": 4.50, "label": "76 – 125 units"},
            {"min": 126, "max": 225, "rate": 6.00, "label": "126 – 225 units"},
            {"min": 226, "max": 400, "rate": 8.75, "label": "226 – 400 units"},
            {"min": 401, "max": float("inf"), "rate": 9.75, "label": "401+ units"},
        ],
        "domestic_customer_charges": [
            {"max_units": 30, "charge": 25.0},
            {"max_units": 75, "charge": 30.0},
            {"max_units": 125, "charge": 45.0},
            {"max_units": 225, "charge": 50.0},
            {"max_units": 400, "charge": 55.0},
            {"max_units": float("inf"), "charge": 55.0},
        ],
        "domestic_default_fixed_charge": 30.0,
        "duty_rate": 0.06,
        "fppca_rate": 0.15,
        "commercial_slabs": [
            {"min": 0, "max": 50, "rate": 6.90, "label": "0 – 50 units"},
            {"min": 51, "max": 100, "rate": 7.50, "label": "51 – 100 units"},
            {"min": 101, "max": 300, "rate": 8.50, "label": "101 – 300 units"},
            {"min": 301, "max": 500, "rate": 9.50, "label": "301 – 500 units"},
            {"min": 501, "max": float("inf"), "rate": 10.50, "label": "501+ units"},
        ],
        "commercial_customer_charge": 60.0,
        "commercial_default_fixed_charge": 150.0,
    },
    "APERC-TO-2024-25": {
        "version": "APERC-TO-2024-25",
        "order_name": "APERC Retail Supply Tariff Order FY 2024–25",
        "financial_year": "2024-25",
        "effective_from": "2024-04-01",
        "effective_to": "2025-03-31",
        "is_official_gazetted": True,
        "citation": "APERC Retail Supply Tariff Order FY 2024-25",
        "domestic_telescopic_slabs": [
            {"min": 0, "max": 30, "rate": 1.90, "label": "0 – 30 units"},
            {"min": 31, "max": 75, "rate": 3.00, "label": "31 – 75 units"},
            {"min": 76, "max": 125, "rate": 4.50, "label": "76 – 125 units"},
            {"min": 126, "max": 225, "rate": 6.00, "label": "126 – 225 units"},
            {"min": 226, "max": 400, "rate": 8.75, "label": "226 – 400 units"},
            {"min": 401, "max": float("inf"), "rate": 9.75, "label": "401+ units"},
        ],
        "domestic_customer_charges": [
            {"max_units": 30, "charge": 25.0},
            {"max_units": 75, "charge": 30.0},
            {"max_units": 125, "charge": 45.0},
            {"max_units": 225, "charge": 50.0},
            {"max_units": 400, "charge": 55.0},
            {"max_units": float("inf"), "charge": 55.0},
        ],
        "domestic_default_fixed_charge": 30.0,
        "duty_rate": 0.06,
        "fppca_rate": 0.15,
        "commercial_slabs": [
            {"min": 0, "max": 50, "rate": 6.90, "label": "0 – 50 units"},
            {"min": 51, "max": 100, "rate": 7.50, "label": "51 – 100 units"},
            {"min": 101, "max": 300, "rate": 8.50, "label": "101 – 300 units"},
            {"min": 301, "max": 500, "rate": 9.50, "label": "301 – 500 units"},
            {"min": 501, "max": float("inf"), "rate": 10.50, "label": "501+ units"},
        ],
        "commercial_customer_charge": 60.0,
        "commercial_default_fixed_charge": 150.0,
    },
}

def parse_financial_year(billing_month: Optional[str]) -> Tuple[str, bool]:
    """
    Parses billing month string and determines Indian Financial Year (April - March).
    """
    if not billing_month:
        return "2026-27", False

    text = billing_month.strip().lower()
    year_match = re.search(r"\b(20\d\d)\b", text)
    year = int(year_match.group(1)) if year_match else None

    month_map = {
        "jan": 1, "january": 1, "01": 1, "1": 1,
        "feb": 2, "february": 2, "02": 2, "2": 2,
        "mar": 3, "march": 3, "03": 3, "3": 3,
        "apr": 4, "april": 4, "04": 4, "4": 4,
        "may": 5, "05": 5, "5": 5,
        "jun": 6, "june": 6, "06": 6, "6": 6,
        "jul": 7, "july": 7, "07": 7, "7": 7,
        "aug": 8, "august": 8, "08": 8, "8": 8,
        "sep": 9, "sept": 9, "september": 9, "09": 9, "9": 9,
        "oct": 10, "october": 10, "10": 10,
        "nov": 11, "november": 11, "11": 11,
        "dec": 12, "december": 12, "12": 12,
    }

    found_month = None
    for k, v in month_map.items():
        if re.search(rf"(^|[^a-z0-9]){k}([^a-z0-9]|$)", text):
            found_month = v
            break

    if year and found_month:
        start_year = year if found_month >= 4 else year - 1
        end_short = f"{(start_year + 1) % 100:02d}"
        return f"{start_year}-{end_short}", True
    elif year:
        end_short = f"{(year + 1) % 100:02d}"
        return f"{year}-{end_short}", False

    return "2026-27", False

def resolve_tariff_schedule(billing_month: Optional[str]) -> Tuple[Dict[str, Any], str, str, str]:
    fy, is_extracted = parse_financial_year(billing_month)
    key = f"APERC-TO-{fy}"

    if key in TARIFF_SCHEDULE_REGISTRY:
        sched = TARIFF_SCHEDULE_REGISTRY[key]
        status = "Verified Official" if is_extracted else "Provisional / Unverified Period"
        trace = (
            f"Selected official {sched['order_name']} (FY {fy}) based on billing period '{billing_month}'."
            if is_extracted
            else f"Selected {sched['order_name']} (FY {fy}) by fallback due to incomplete date extraction."
        )
        return sched, sched["version"], status, trace

    fallback = TARIFF_SCHEDULE_REGISTRY["APERC-TO-2026-27"]
    return (
        fallback,
        fallback["version"],
        "Provisional / Unverified Period",
        f"Tariff order for FY {fy} not registered. Applied {fallback['version']} provisionally.",
    )

def calculate_aperc_tariff(req: TariffAuditRequest) -> TariffAuditResponse:
    units = max(0.0, float(req.units_consumed))
    actual_bill = max(0.0, float(req.actual_bill_amount))
    discom = req.discom if req.discom in AP_DISCOMS_INFO else "APSPDCL"
    discom_info = AP_DISCOMS_INFO[discom]
    category = req.consumer_category
    is_demo = bool(req.is_demo)

    schedule, version, schedule_status, trace_explanation = resolve_tariff_schedule(req.billing_month)

    rules = (
        schedule["commercial_slabs"]
        if category == "Commercial"
        else schedule["domestic_telescopic_slabs"]
    )

    # 1. Telescopic slab-wise calculation
    remaining = units
    prev_max = 0.0
    slabs: List[SlabCalculationItem] = []
    total_energy_charges = 0.0

    for idx, rule in enumerate(rules):
        capacity = float("inf") if rule["max"] == float("inf") else (rule["max"] - prev_max)
        units_in_slab = min(max(0.0, remaining), capacity)

        if units_in_slab > 0 or (idx == 0 and units == 0):
            cost = round(units_in_slab * rule["rate"], 2)
            total_energy_charges = round(total_energy_charges + cost, 2)
            slabs.append(
                SlabCalculationItem(
                    slab_range=rule["label"],
                    units_in_slab=round(units_in_slab, 2),
                    rate_per_unit=rule["rate"],
                    cost=cost,
                    percentage_of_energy=0.0,
                )
            )
            remaining -= units_in_slab

        prev_max = rule["max"]
        if remaining <= 0:
            break

    # Calculate percentage share of energy charges
    for s in slabs:
        if total_energy_charges > 0:
            s.percentage_of_energy = round((s.cost / total_energy_charges) * 100, 1)

    # 2. Customer Charges (tiered by consumption)
    if category == "Commercial":
        customer_charges = float(schedule["commercial_customer_charge"])
    else:
        customer_charges = 25.0
        for tier in schedule["domestic_customer_charges"]:
            if units <= tier["max_units"]:
                customer_charges = float(tier["charge"])
                break

    # 3. Fixed connection charges
    if req.fixed_charges is not None and req.fixed_charges >= 0:
        fixed_charges = round(float(req.fixed_charges), 2)
    else:
        fixed_charges = (
            float(schedule["commercial_default_fixed_charge"])
            if category == "Commercial"
            else float(schedule["domestic_default_fixed_charge"])
        )

    # 4. Electricity Duty (6 paise per unit as per AP Electricity Duty Act)
    electricity_duty = round(units * schedule["duty_rate"], 2)

    # 5. FPPCA Fuel Surcharge
    if req.fuel_adjustment_charges is not None and req.fuel_adjustment_charges >= 0:
        fppca = round(float(req.fuel_adjustment_charges), 2)
    else:
        fppca = round(units * schedule["fppca_rate"], 2)

    # 6. Reconciled Total Expected Bill
    calculated_sum = round(
        total_energy_charges + fixed_charges + customer_charges + electricity_duty + fppca,
        2,
    )
    expected_bill = calculated_sum
    subtotal = calculated_sum

    # Statutory rounding under APERC Electricity Supply Code (rounded off to nearest rupee)
    rounded_payable_amount = float(int(expected_bill + 0.5) if expected_bill >= 0 else int(expected_bill - 0.5))
    rounding_adjustment = round(rounded_payable_amount - expected_bill, 2)
    is_exact_or_rounding_match = (actual_bill == expected_bill) or (actual_bill == rounded_payable_amount)

    # 7. Variance analysis
    difference = round(actual_bill - expected_bill, 2)
    percentage_difference = (
        round((abs(difference) / expected_bill) * 100, 1) if expected_bill > 0 else 0.0
    )

    # 8. Meter delta verification
    meter_match = True
    meter_delta: Optional[float] = None
    if (
        req.meter_read_current is not None
        and req.meter_read_previous is not None
        and req.meter_read_current > 0
    ):
        meter_delta = req.meter_read_current - req.meter_read_previous
        if abs(meter_delta - units) > 2.0:
            meter_match = False

    # 9. Canonical Status & classification
    DEFAULT_DISPUTE_THRESHOLD = 25.0
    abs_variance = abs(difference)

    if units <= 0 or actual_bill <= 0:
        anomaly_type = "Incomplete"
        status = "Incomplete Audit"
        status_variant = "orange"
    elif difference > DEFAULT_DISPUTE_THRESHOLD:
        anomaly_type = "Overcharged"
        status = "Potential Overcharge"
        status_variant = "red"
    elif difference < -DEFAULT_DISPUTE_THRESHOLD:
        anomaly_type = "Undercharged"
        status = "Review Recommended"
        status_variant = "orange"
    elif not meter_match:
        anomaly_type = "Normal"
        status = "Review Recommended"
        status_variant = "orange"
    else:
        # abs_variance <= DEFAULT_DISPUTE_THRESHOLD
        anomaly_type = "Normal"
        status = "Verified"
        status_variant = "green"

    # 10. Highest slab applied
    highest_slab = rules[0]["label"]
    for r in reversed(rules):
        if units > r["min"]:
            highest_slab = f"{r['label']} @ ₹{r['rate']:.2f}/u"
            break

    formula = (
        f"Energy Charges (₹{total_energy_charges:.2f}) + "
        f"Fixed Charges (₹{fixed_charges:.2f}) + "
        f"Customer Charges (₹{customer_charges:.2f}) + "
        f"Electricity Duty (₹{electricity_duty:.2f}) + "
        f"FPPCA (₹{fppca:.2f}) = ₹{expected_bill:.2f}"
    )

    demo_prefix = "[DEMO SAMPLE BILL] " if is_demo else ""
    if is_exact_or_rounding_match and actual_bill != expected_bill:
        variance_text = (
            f"{demo_prefix}Actual billed amount (₹{actual_bill:,.2f}) matches the APERC expected payable bill "
            f"after statutory nearest-rupee rounding (calculated ₹{expected_bill:,.2f} rounded to ₹{rounded_payable_amount:,.2f} per APERC Supply Code). "
            f"Highest slab tier entered: {highest_slab}. Slabs applied: Energy ₹{total_energy_charges:.2f}, "
            f"Fixed ₹{fixed_charges:.2f}, Customer ₹{customer_charges:.2f}, Duty ₹{electricity_duty:.2f}, "
            f"FPPCA ₹{fppca:.2f}. The ₹{abs(difference):.2f} rounding adjustment conforms to utility billing terms."
        )
    elif difference > DEFAULT_DISPUTE_THRESHOLD:
        variance_text = (
            f"{demo_prefix}Actual billed amount (₹{actual_bill:,.2f}) exceeds the APERC expected tariff "
            f"(₹{expected_bill:,.2f}) by ₹{difference:,.2f} (+{percentage_difference}%). "
            f"Highest slab tier entered: {highest_slab}. Slabs applied: Energy ₹{total_energy_charges:.2f}, "
            f"Fixed ₹{fixed_charges:.2f}, Customer ₹{customer_charges:.2f}, Duty ₹{electricity_duty:.2f}, "
            f"FPPCA ₹{fppca:.2f}. The excess variance of ₹{difference:,.2f} is not accounted for by published APERC retail tariff schedules."
        )
    elif difference < -DEFAULT_DISPUTE_THRESHOLD:
        variance_text = (
            f"{demo_prefix}Actual billed statement (₹{actual_bill:,.2f}) is ₹{abs(difference):,.2f} substantially below the calculated "
            f"APERC standard tariff (₹{expected_bill:,.2f}). This substantial difference may indicate prompt payment rebates, "
            f"government subsidies, solar net-metering credits, cycle adjustments, or an anomalous meter reading."
        )
    elif difference == 0:
        variance_text = (
            f"{demo_prefix}Actual billed amount (₹{actual_bill:,.2f}) matches APERC expected charges exactly (0 variance)."
        )
    else:
        variance_text = (
            f"{demo_prefix}Actual billed amount (₹{actual_bill:,.2f}) matches the APERC expected tariff "
            f"within statutory tolerance (₹{expected_bill:,.2f}, variance: {difference:+,.2f})."
        )

    ref_id = f"BG-{discom}-{int(time.time())}"
    formatted_date = datetime.datetime.now().strftime("%d %b %Y")

    return TariffAuditResponse(
        audit_certificate_id=ref_id,
        audit_reference_id=ref_id,
        timestamp=formatted_date,
        discom=discom,
        discom_full_name=discom_info["name"],
        consumer_category=category,
        billing_month=req.billing_month,
        financial_year=schedule["financial_year"],
        tariff_schedule_version=version,
        tariff_schedule_status=schedule_status,
        tariff_citation=schedule["citation"],
        schedule_trace_explanation=trace_explanation,
        is_demo=is_demo,
        units_consumed=units,
        meter_match=meter_match,
        meter_delta_units=meter_delta,
        expected_bill=expected_bill,
        actual_bill=actual_bill,
        difference=difference,
        percentage_difference=percentage_difference,
        rounded_payable_amount=rounded_payable_amount,
        rounding_adjustment=rounding_adjustment,
        status=status,
        status_variant=status_variant,
        anomaly_type=anomaly_type,
        slabs=slabs,
        total_energy_charges=total_energy_charges,
        fixed_charges=fixed_charges,
        electricity_duty=electricity_duty,
        fppca_fuel_surcharge=fppca,
        customer_charges=customer_charges,
        subtotal=subtotal,
        calculation_formula=formula,
        highest_slab_applied=highest_slab,
        variance_explanation=variance_text,
        regulation_reference="APERC Consumer Grievance Redressal Forum (CGRF) Regulations",
        timeline_reference="Grievance review and hearing schedules are governed by DISCOM CGRF procedures",
        dispute_eligibility=(
            f"A billing variance of ₹{difference:,.2f} may be submitted as an inquiry to {discom} customer care or local CGRF for meter and ledger verification."
            if status in ("Potential Overcharge", "Review Recommended")
            else "Statement verified compliant; no dispute needed."
        ),
    )
