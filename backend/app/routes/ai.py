from fastapi import APIRouter
from ..schemas import (
    MultilingualExplainRequest,
    MultilingualExplainResponse,
    AssistantChatRequest,
    AssistantChatResponse,
)
from ..gemini_service import gemini_service

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/explain", response_model=MultilingualExplainResponse)
async def explain_audit(req: MultilingualExplainRequest):
    """Generates official APERC plain-language explanation in requested language."""
    return await gemini_service.multilingual_explain(req.language, req.audit_data)

@router.post("/chat", response_model=AssistantChatResponse)
async def chat_assistant(req: AssistantChatRequest):
    """Contextual electricity assistant citing real audited parameters."""
    return await gemini_service.assistant_chat(
        req.message, req.language, req.bill_context
    )
