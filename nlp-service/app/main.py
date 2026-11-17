from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import API_VERSION
from app.core.security import RequestIDMiddleware, ErrorHandlingMiddleware
from app.core.logging_config import structured_logger
from app.api.v1.endpoints import router as v1_router

# Feature routers
from features.language_detector.router import router as language_detector_router
from features.f14_synthetic_data.router import router as synthetic_data_router
from features.f08_ingest_api import documents_router

app = FastAPI(
    title="Multilingual College Assistant - NLP Production API",
    version=API_VERSION,
    description=(
        "Production-grade NLP microservice featuring a modular sequential pipeline: "
        "Language Detection -> Transliteration -> Intent Classification -> "
        "Entity Extraction -> Document Retrieval -> Multilingual Answering."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Custom Middlewares
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestIDMiddleware)

# Standard CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(v1_router)
app.include_router(language_detector_router)
app.include_router(synthetic_data_router)
app.include_router(documents_router)

# Backward-compatibility endpoint for baseline
@app.post("/baseline/query", include_in_schema=False)
def legacy_baseline_query(request_body: dict):
    from app.pipeline import pipeline
    q = request_body.get("query", "")
    lang = request_body.get("language_override")
    ctx = pipeline.execute(q, language_override=lang)
    return {
        "answer": ctx.answer,
        "language": ctx.language,
        "intent": ctx.intent,
        "confidence": ctx.intent_confidence,
        "source_doc": ctx.source_doc,
        "pipeline_details": {
            "raw_query": ctx.raw_query,
            "normalized_query": ctx.normalized_query,
            "tokens": ctx.tokens,
            "detected_language": ctx.language,
            "script": ctx.script,
            "language_confidence": ctx.language_confidence,
            "intent": ctx.intent,
            "intent_confidence": ctx.intent_confidence,
            "is_fallback_intent": ctx.is_fallback_intent,
            "entities": ctx.entities,
            "retrieved_chunks": ctx.retrieved_chunks,
            "execution_time_ms": ctx.total_latency_ms
        }
    }

@app.get("/health", include_in_schema=False)
def root_health():
    return {"status": "ok", "service": "nlp-service", "version": API_VERSION}

@app.on_event("startup")
async def startup_event():
    structured_logger.info("NLP Production Microservice started successfully.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
