import json
import asyncio
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.schemas import (
    QueryRequest,
    QueryResponse,
    AnalyzeResponse,
    HealthResponse,
    VersionResponse,
    EntityItem,
    ChunkItem
)
from app.pipeline import pipeline
from app.core.config import API_VERSION, FEATURES_CONFIG_PATH
from app.core.security import verify_api_key
from app.core.metrics import metrics

router = APIRouter(prefix="/v1", tags=["Production API v1"])

@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check for service liveness and readiness."""
    return HealthResponse(
        status="ok",
        service="nlp-service",
        version=API_VERSION,
        models_loaded=True
    )

@router.get("/ready")
def get_readiness():
    """Returns 200 when search indexes and pipeline models are loaded; 503 during warmup."""
    from features.f01_hybrid_retrieval.bm25_retriever import bm25_retriever
    from features.f01_hybrid_retrieval.dense_retriever import dense_retriever
    from fastapi.responses import JSONResponse
    from app.core.llm_health import get_llm_status

    llm_status = get_llm_status()

    is_ready = bool(bm25_retriever.chunks and len(bm25_retriever.chunks) > 0)
    if is_ready:
        return JSONResponse(
            status_code=200,
            content={
                "status": "ready",
                "service": "nlp-service",
                "version": API_VERSION,
                "models_loaded": True,
                "llm": llm_status.get("llm"),
                "llm_error": llm_status.get("llm_error"),
                "llm_model": llm_status.get("llm_model"),
                "llm_checked_at": llm_status.get("llm_checked_at"),
                "chunks_count": len(bm25_retriever.chunks)
            }
        )
    return JSONResponse(
        status_code=503,
        content={
            "status": "warming_up",
            "service": "nlp-service",
            "version": API_VERSION,
            "models_loaded": False,
            "llm": llm_status.get("llm"),
            "llm_error": llm_status.get("llm_error"),
            "llm_model": llm_status.get("llm_model"),
            "llm_checked_at": llm_status.get("llm_checked_at"),
            "error": "Indexes warming up or chunks not loaded"
        }
    )

@router.get("/index/status")
def get_index_status():
    """Returns index status, chunk counts, document counts, and loaded models."""
    from features.f01_hybrid_retrieval.bm25_retriever import bm25_retriever
    from features.f01_hybrid_retrieval.dense_retriever import dense_retriever

    chunks = bm25_retriever.chunks or []
    doc_names = set(c.get("doc_name") for c in chunks if c.get("doc_name"))
    
    return {
        "index_version": getattr(bm25_retriever, "index_version", "v1"),
        "document_count": len(doc_names),
        "chunk_count": len(chunks),
        "bm25_loaded": bm25_retriever.bm25 is not None,
        "bm25_chunks": len(bm25_retriever.chunks) if bm25_retriever.chunks else 0,
        "dense_loaded": dense_retriever.index is not None or dense_retriever.model is not None,
        "dense_chunks": len(dense_retriever.chunks) if dense_retriever.chunks else 0,
        "models_loaded": True
    }

@router.post("/debug/retrieve")
def debug_retrieve(body: dict):
    """Admin debug endpoint to test retrieval directly."""
    from features.f01_hybrid_retrieval.hybrid_retriever import get_retriever
    from app.core.config import FEATURES_CONFIG_PATH
    import json
    method = "hybrid_rerank"
    if FEATURES_CONFIG_PATH.exists():
        try:
            with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                method = json.load(f).get("retrieval_method", "hybrid_rerank")
        except Exception:
            pass
    retriever = get_retriever(method)
    query = body.get("query", "")
    top_k = body.get("top_k", 5)
    hits = retriever.retrieve(query, top_k=top_k)
    return {
        "query": query,
        "method": getattr(retriever, "name", method),
        "chunks": hits
    }

@router.get("/version", response_model=VersionResponse)
def get_version():
    """Returns active service version, git sha, and dynamically loaded feature flags."""
    import json
    import os
    flags = {}
    if FEATURES_CONFIG_PATH.exists():
        try:
            with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                flags = json.load(f)
        except Exception:
            pass

    return VersionResponse(
        service="nlp-service",
        version=API_VERSION,
        api_prefix="/v1",
        git_sha=os.getenv("GIT_SHA", "unknown"),
        build_time=os.getenv("BUILD_TIME", "unknown"),
        active_features=flags
    )

@router.get("/metrics")
def get_metrics():
    """Exposes real-time counter metrics and latency statistics."""
    return metrics.get_metrics()

@router.post("/query", response_model=QueryResponse, dependencies=[Depends(verify_api_key)])
def process_query(request_body: QueryRequest, request: Request):
    """
    Main endpoint for student queries.
    Executes full pipeline: Language -> Transliteration -> Intent -> Entities -> Retrieval -> Answer.
    Protected via X-API-Key header.
    """
    req_id = getattr(request.state, "request_id", "req-direct")

    ctx = pipeline.execute(
        raw_query=request_body.query,
        language_override=request_body.language_override,
        request_id=req_id,
        session_id=request_body.session_id,
        dialogue_state=request_body.dialogue_state,
        conversation_history=request_body.conversation_history
    )

    entities = [
        EntityItem(label=e["label"], text=e["text"], start=e["start"], end=e["end"])
        for e in ctx.entities
    ]

    analysis = AnalyzeResponse(
        request_id=req_id,
        raw_query=ctx.raw_query,
        normalized_query=ctx.normalized_query,
        tokens=ctx.tokens,
        detected_language=ctx.language,
        script=ctx.script,
        language_confidence=ctx.language_confidence,
        intent=ctx.intent,
        intent_confidence=ctx.intent_confidence,
        is_fallback_intent=ctx.is_fallback_intent,
        entities=entities,
        retrieved_chunks=[
            ChunkItem(
                chunk_id=c["chunk_id"],
                doc_name=c["doc_name"],
                page=c["page"],
                score=c["score"],
                text=c["text"]
            )
            for c in ctx.retrieved_chunks
        ],
        decision=ctx.decision,
        decision_reason=getattr(ctx, "decision_reason", "ANSWERED"),
        clarification_question=ctx.clarification_question,
        quick_replies=ctx.quick_replies,
        contact_info=ctx.contact_info,
        standalone_query=ctx.standalone_query,
        is_follow_up=ctx.is_follow_up,
        is_reset=ctx.is_reset,
        dialogue_state=ctx.dialogue_state,
        stage_latencies_ms=ctx.stage_latencies_ms,
        total_latency_ms=ctx.total_latency_ms
    )

    return QueryResponse(
        request_id=req_id,
        answer=ctx.answer,
        language=ctx.language,
        intent=ctx.intent,
        confidence=ctx.intent_confidence,
        source_doc=ctx.source_doc,
        citations=ctx.citations,
        grounded=ctx.grounded,
        generation_mode=ctx.generation_mode,
        hallucination_score=ctx.hallucination_score,
        entities=entities,
        decision=ctx.decision,
        decision_reason=getattr(ctx, "decision_reason", "ANSWERED"),
        clarification_question=ctx.clarification_question,
        quick_replies=ctx.quick_replies,
        contact_info=ctx.contact_info,
        standalone_query=ctx.standalone_query,
        is_follow_up=ctx.is_follow_up,
        is_reset=ctx.is_reset,
        dialogue_state=ctx.dialogue_state,
        calendar_events=getattr(ctx, "calendar_events", []),
        analysis=analysis,
        execution_time_ms=ctx.total_latency_ms
    )

@router.post("/query/stream", dependencies=[Depends(verify_api_key)])
async def stream_query(request_body: QueryRequest, request: Request):
    """
    Feature 04: Server-Sent Events (SSE) streaming endpoint for RAG generation.
    Streams tokens chunk by chunk and sends final citations event.
    """
    req_id = getattr(request.state, "request_id", "req-direct")

    ctx = pipeline.execute(
        raw_query=request_body.query,
        language_override=request_body.language_override,
        request_id=req_id,
        session_id=request_body.session_id,
        dialogue_state=request_body.dialogue_state,
        conversation_history=request_body.conversation_history
    )

    async def event_generator():
        # Stream response words with simulated typing latency
        words = ctx.answer.split(" ")
        for i, w in enumerate(words):
            yield f"data: {json.dumps({'token': w + (' ' if i < len(words) - 1 else ''), 'done': False})}\n\n"
            await asyncio.sleep(0.015)

        # Send final citations and metadata event
        meta = {
            "done": True,
            "citations": ctx.citations,
            "grounded": ctx.grounded,
            "generation_mode": ctx.generation_mode,
            "hallucination_score": ctx.hallucination_score,
            "intent": ctx.intent,
            "decision": ctx.decision
        }
        yield f"data: {json.dumps(meta)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/analyze", response_model=AnalyzeResponse, dependencies=[Depends(verify_api_key)])
def analyze_query(request_body: QueryRequest, request: Request):
    """
    Returns intermediate pipeline analysis (language, tokens, intent, entities, chunks)
    without synthesizing an extractive or template answer.
    """
    req_id = getattr(request.state, "request_id", "req-direct")

    ctx = pipeline.analyze(
        raw_query=request_body.query,
        language_override=request_body.language_override,
        request_id=req_id,
        session_id=request_body.session_id,
        dialogue_state=request_body.dialogue_state,
        conversation_history=request_body.conversation_history
    )

    entities = [
        EntityItem(label=e["label"], text=e["text"], start=e["start"], end=e["end"])
        for e in ctx.entities
    ]

    return AnalyzeResponse(
        request_id=req_id,
        raw_query=ctx.raw_query,
        normalized_query=ctx.normalized_query,
        tokens=ctx.tokens,
        detected_language=ctx.language,
        script=ctx.script,
        language_confidence=ctx.language_confidence,
        intent=ctx.intent,
        intent_confidence=ctx.intent_confidence,
        is_fallback_intent=ctx.is_fallback_intent,
        entities=entities,
        retrieved_chunks=[
            ChunkItem(
                chunk_id=c["chunk_id"],
                doc_name=c["doc_name"],
                page=c["page"],
                score=c["score"],
                text=c["text"]
            )
            for c in ctx.retrieved_chunks
        ],
        decision=ctx.decision,
        decision_reason=getattr(ctx, "decision_reason", "ANSWERED"),
        clarification_question=ctx.clarification_question,
        quick_replies=ctx.quick_replies,
        contact_info=ctx.contact_info,
        standalone_query=ctx.standalone_query,
        is_follow_up=ctx.is_follow_up,
        is_reset=ctx.is_reset,
        dialogue_state=ctx.dialogue_state,
        stage_latencies_ms=ctx.stage_latencies_ms,
        total_latency_ms=ctx.total_latency_ms
    )
