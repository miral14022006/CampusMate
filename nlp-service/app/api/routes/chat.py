from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import process_query

router = APIRouter(tags=["Chat"])

@router.post("/v1/chat", response_model=ChatResponse)
@router.post("/v1/query", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    result = process_query(
        query=req.query,
        session_id=req.sessionId,
        preferred_mode=req.preferred_mode or "rag"
    )
    return ChatResponse(**result)
