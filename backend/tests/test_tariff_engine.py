import unittest
from backend.app.tariff_engine import (
    calculate_aperc_tariff,
    resolve_tariff_schedule,
    parse_financial_year,
    TARIFF_SCHEDULE_REGISTRY,
)
from backend.app.schemas import TariffAuditRequest

class TestTariffEngine(unittest.TestCase):
    def test_schedule_resolution_and_fy(self):
        fy, is_extracted = parse_financial_year("August 2026")
        self.assertEqual(fy, "2026-27")
        self.assertTrue(is_extracted)

        sched, version, status, trace = resolve_tariff_schedule("August 2026")
        self.assertEqual(version, "APERC-TO-2026-27")
        self.assertEqual(status, "Verified Official")

        fy_feb, is_feb_extracted = parse_financial_year("February 2026")
        self.assertEqual(fy_feb, "2025-26")
        self.assertTrue(is_feb_extracted)

    def test_boundary_0_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=0,
            actual_bill_amount=55.0,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 0.0)
        self.assertEqual(res.customer_charges, 25.0)
        self.assertEqual(res.fixed_charges, 30.0)
        self.assertEqual(res.electricity_duty, 0.0)
        self.assertEqual(res.fppca_fuel_surcharge, 0.0)
        self.assertEqual(res.expected_bill, 55.0)
        self.assertEqual(res.status, "Incomplete Audit")

    def test_boundary_30_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=30,
            actual_bill_amount=118.30,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 57.0)
        self.assertEqual(res.customer_charges, 25.0)
        self.assertEqual(res.electricity_duty, 1.80)
        self.assertEqual(res.fppca_fuel_surcharge, 4.50)
        self.assertEqual(res.expected_bill, 118.30)
        self.assertEqual(res.difference, 0.0)

    def test_boundary_31_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=31,
            actual_bill_amount=126.51,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 60.0)
        self.assertEqual(res.customer_charges, 30.0)
        self.assertEqual(res.expected_bill, 126.51)

    def test_boundary_75_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=75,
            actual_bill_amount=267.75,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 192.0)
        self.assertEqual(res.customer_charges, 30.0)
        self.assertEqual(res.expected_bill, 267.75)

    def test_boundary_76_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=76,
            actual_bill_amount=287.46,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 196.50)
        self.assertEqual(res.customer_charges, 45.0)
        self.assertEqual(res.expected_bill, 287.46)

    def test_boundary_125_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=125,
            actual_bill_amount=518.25,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 417.0)
        self.assertEqual(res.customer_charges, 45.0)
        self.assertEqual(res.expected_bill, 518.25)

    def test_boundary_126_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=126,
            actual_bill_amount=529.46,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 423.0)
        self.assertEqual(res.customer_charges, 50.0)
        self.assertEqual(res.expected_bill, 529.46)

    def test_boundary_225_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=225,
            actual_bill_amount=1144.25,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 1017.0)
        self.assertEqual(res.customer_charges, 50.0)
        self.assertEqual(res.expected_bill, 1144.25)

    def test_boundary_226_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=226,
            actual_bill_amount=1158.21,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 1025.75)
        self.assertEqual(res.customer_charges, 55.0)
        self.assertEqual(res.expected_bill, 1158.21)

    def test_boundary_400_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=400,
            actual_bill_amount=2717.25,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 2548.25)
        self.assertEqual(res.customer_charges, 55.0)
        self.assertEqual(res.expected_bill, 2717.25)

    def test_boundary_401_units(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=401,
            actual_bill_amount=2727.21,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 2558.0)
        self.assertEqual(res.customer_charges, 55.0)
        self.assertEqual(res.expected_bill, 2727.21)

    def test_actual_320_units_example(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=320,
            actual_bill_amount=2850.0,
            billing_month="August 2026",
            fixed_charges=30.0,
            fuel_adjustment_charges=48.0,
            taxes=19.0,
            is_demo=True,
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 1848.25)
        self.assertEqual(res.customer_charges, 55.0)
        self.assertEqual(res.fixed_charges, 30.0)
        self.assertEqual(res.electricity_duty, 19.20)
        self.assertEqual(res.fppca_fuel_surcharge, 48.0)
        self.assertEqual(res.expected_bill, 2000.45)
        self.assertEqual(res.actual_bill, 2850.0)
        self.assertEqual(res.difference, 849.55)
        self.assertEqual(res.percentage_difference, 42.5)
        self.assertEqual(res.status, "Potential Overcharge")
        self.assertTrue(res.is_demo)
        self.assertIn("[DEMO SAMPLE BILL]", res.variance_explanation)

    def test_reconciliation_invariant(self):
        for u in [0, 30, 31, 75, 76, 125, 126, 225, 226, 320, 400, 401]:
            req = TariffAuditRequest(
                units_consumed=u,
                actual_bill_amount=1500.0,
                billing_month="August 2026",
            )
            res = calculate_aperc_tariff(req)
            expected_sum = round(
                res.total_energy_charges
                + res.customer_charges
                + res.fixed_charges
                + res.electricity_duty
                + res.fppca_fuel_surcharge,
                2,
            )
            self.assertEqual(res.expected_bill, expected_sum)
            self.assertEqual(res.subtotal, res.expected_bill)

    def test_statutory_rounding_535_70_vs_536(self):
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=125,
            actual_bill_amount=536.0,
            billing_month="October 2026",
            fixed_charges=10.0,
            fuel_adjustment_charges=56.2,
            taxes=7.5,
        )
        res = calculate_aperc_tariff(req)
        self.assertEqual(res.total_energy_charges, 417.0)
        self.assertEqual(res.customer_charges, 45.0)
        self.assertEqual(res.fixed_charges, 10.0)
        self.assertEqual(res.electricity_duty, 7.5)
        self.assertEqual(res.fppca_fuel_surcharge, 56.2)
        self.assertEqual(res.expected_bill, 535.7)
        self.assertEqual(res.actual_bill, 536.0)
        self.assertEqual(res.difference, 0.3)
        self.assertEqual(res.rounded_payable_amount, 536.0)
        self.assertEqual(res.rounding_adjustment, 0.3)
        self.assertEqual(res.status, "Verified")
        self.assertEqual(res.status_variant, "green")
        self.assertEqual(res.anomaly_type, "Normal")
        self.assertIn("no dispute needed", res.dispute_eligibility)

    def test_undercharge_screenshot_case_review_recommended(self):
        # Screenshot scenario: expected ~1922.45, actual 501.00 (difference < -25)
        # Must be classified as Review Recommended and orange, NEVER Verified or green
        req = TariffAuditRequest(
            discom="APSPDCL",
            consumer_category="Domestic",
            units_consumed=300,
            actual_bill_amount=501.0,
            billing_month="August 2026",
        )
        res = calculate_aperc_tariff(req)
        self.assertTrue(res.difference < -25.0)
        self.assertEqual(res.status, "Review Recommended")
        self.assertEqual(res.status_variant, "orange")
        self.assertEqual(res.anomaly_type, "Undercharged")
        self.assertIn("substantially below", res.variance_explanation)

if __name__ == "__main__":
    unittest.main()

