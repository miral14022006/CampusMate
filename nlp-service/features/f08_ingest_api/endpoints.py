import time
from fastapi import APIRouter, HTTPException, Depends
from app.core.security import verify_api_key
from features.f08_ingest_api.schemas import IngestRequest, IngestResponse, ReindexResponse
from features.f08_ingest_api.ingest_manager import ingest_manager

router = APIRouter(prefix="/v1/documents", tags=["Document Ingestion & Versioning"])

@router.post("/ingest", response_model=IngestResponse, dependencies=[Depends(verify_api_key)])
def ingest_document(req: IngestRequest):
    """
    Parses document (PDF/DOCX/TXT), creates versioned chunks,
    marks superseded prior versions, and rebuilds retrieval indexes.
    """
    try:
        res = ingest_manager.ingest_file(
            file_path=req.file_path,
            title=req.title,
            topic_key=req.topic_key,
            doc_type=req.doc_type,
            version=req.version,
            effective_date=req.effective_date,
            department=req.department,
            language=req.language,
            replace_topic=req.replace_topic
        )
        return IngestResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@router.post("/reindex", response_model=ReindexResponse, dependencies=[Depends(verify_api_key)])
def reindex_all():
    """
    Rebuilds BM25 and FAISS indexes from all active chunks.
    """
    try:
        ingest_manager.rebuild_indexes()
        chunks = ingest_manager._load_chunks()
        active = len([c for c in chunks if c.get("status", "active") == "active"])
        new_ver = f"idx_{int(time.time())}"
        return ReindexResponse(
            status="success",
            message="All active documents successfully re-indexed.",
            new_index_version=new_ver,
            active_chunks=active
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-index failed: {str(e)}")

