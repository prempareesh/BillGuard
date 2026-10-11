# APERC Tariff Verification Methodology

This document details the mathematical formulation, regulatory schedule registry, and classification rules implemented in BillGuard's deterministic tariff auditing engine.

---

## 1. Statutory Context & Regulatory Scope

BillGuard evaluates electricity bills against Retail Supply Tariff Orders issued by the **Andhra Pradesh Electricity Regulatory Commission (APERC)**. The engine models domestic and commercial tariff schedules for the three state distribution companies (DISCOMs):

- **APSPDCL:** Southern Power Distribution Company of AP Ltd (Tirupati, Nellore, Kadapa, Chittoor, Anantapur)
- **APCPDCL:** Central Power Distribution Company of AP Ltd (Vijayawada, Guntur, Krishna, Prakasam)
- **APEPDCL:** Eastern Power Distribution Company of AP Ltd (Visakhapatnam, Srikakulam, Vizianagaram, Godavari)

---

## 2. Telescopic Domestic Slab Schedule (LT-I Domestic)

Under the gazetted APERC Retail Supply Tariff Order for FY 2026–27 (which maintains the structure of FY 2025–26 / FY 2024–25), domestic energy charges are calculated using **telescopic slabs**:

| Consumption Slab | Bracket Size | Energy Charge Rate | Regulatory Reference |
| :--- | :---: | :---: | :--- |
| **0 – 30 units** | First 30 units | **₹1.90 / unit** | APERC LT-I Domestic Category Schedule |
| **31 – 75 units** | Next 45 units | **₹3.00 / unit** | APERC LT-I Domestic Category Schedule |
| **76 – 125 units** | Next 50 units | **₹4.50 / unit** | APERC LT-I Domestic Category Schedule |
| **126 – 225 units** | Next 100 units | **₹6.00 / unit** | APERC LT-I Domestic Category Schedule |
| **226 – 400 units** | Next 175 units | **₹8.75 / unit** | APERC LT-I Domestic Category Schedule |
| **401+ units** | Above 400 units | **₹9.75 / unit** | APERC LT-I Domestic Category Schedule |

### Telescopic Calculation Algorithm

For a total recorded consumption $U$ (kWh):

$$\text{Energy Charges} = \sum_{i=1}^{N} \min\left(\max(0, U - \text{min}_i), \text{max}_i - \text{min}_i\right) \times \text{rate}_i$$

Each kilowatt-hour is charged at the specific rate of the bracket it falls into, rather than applying the highest rate to the entire volume.

---

## 3. Statutory Levies, Customer Charges, and Rounding

In addition to energy charges, Andhra Pradesh electricity statements include:

### A. Customer Charges (Tiered by Consumption)
- $0 \le U \le 30$: ₹25.00
- $31 \le U \le 75$: ₹30.00
- $76 \le U \le 125$: ₹45.00
- $126 \le U \le 225$: ₹50.00
- $226 \le U \le 400$: ₹55.00
- $U > 400$: ₹55.00

### B. Fixed Connection Charges
- Default baseline domestic connection charge: **₹30.00** (or actual sanctioned load charge if specified).

### C. Electricity Duty
- Imposed under the **Andhra Pradesh Electricity Duty Act**: **₹0.06 per unit** ($\text{Units} \times 0.06$).

### D. Fuel Surcharge (FPPCA)
- Fuel and Power Purchase Cost Adjustment baseline: **₹0.15 per unit** (or bill-specified line item).

### E. Statutory Rounding
Under the APERC Electricity Supply Code, the payable amount on consumer statements is rounded to the nearest integer rupee:

$$\text{Payable Amount} = \text{round}(\text{Calculated Subtotal})$$

---

## 4. Variance Classification & Dispute Threshold

BillGuard computes the absolute variance between the billed amount and the deterministic APERC total:

$$\Delta = \text{Billed Amount} - \text{Calculated Expected Total}$$

The engine classifies results according to an internal materiality threshold of **₹25.00**:

```
If Billed Units <= 0 or Actual Bill <= 0:
    Status = "Incomplete Audit" (Orange)

Else If Δ > +₹25.00:
    Status = "Potential Overcharge" (Red)
    Action = Generate CGRF formal dispute petition

Else If Δ < -₹25.00:
    Status = "Review Recommended" (Orange)
    Action = Review billing cycle adjustments or undercharge clarification

Else If |Meter Delta - Billed Units| > 2.0:
    Status = "Review Recommended" (Orange)
    Action = Verify meter reading transcription with DISCOM section officer

Else (|Δ| <= ₹25.00):
    Status = "Verified" (Green)
    Action = Bill complies with applicable APERC tariff calculations
```

---

## 5. Consumer Grievance Escalation (CGRF)

Under **APERC Consumer Grievance Redressal Forum Regulations**, consumers have the statutory right to seek redressal if billed charges do not adhere to approved tariff orders.

When an audit variance exceeds the review threshold, BillGuard drafts a formal petition containing:
1. Consumer Service Number and Circle Office address.
2. Verified billing cycle and units consumed.
3. Itemized mathematical reconciliation citing specific APERC Retail Tariff Order clauses.
4. Formal prayer requesting recalculation, bill rectification, or credit adjustment.
