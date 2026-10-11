from fastapi import APIRouter
from ..schemas import TariffAuditRequest, TariffAuditResponse
from ..tariff_engine import calculate_aperc_tariff, AP_DISCOMS_INFO

router = APIRouter(prefix="/api/tariff", tags=["tariff"])

@router.post("/audit", response_model=TariffAuditResponse)
@router.post("/calculate", response_model=TariffAuditResponse)
async def audit_tariff(req: TariffAuditRequest):
    """
    100% Deterministic APERC Tariff Audit Engine.
    Computes exact telescopic slab charges, fixed connection fees, electricity duty,
    FPPCA fuel adjustment, and evaluates statutory grievance eligibility.
    """
    return calculate_aperc_tariff(req)

@router.get("/discoms")
async def list_discoms():
    """Returns official APERC regulated electricity distribution companies."""
    return [
        {"id": k, "name": v["name"], "region": v["region"]}
        for k, v in AP_DISCOMS_INFO.items()
    ]
