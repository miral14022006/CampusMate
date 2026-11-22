from fastapi import APIRouter
from typing import Dict, Any
from app.services.document_service import document_service

router = APIRouter(prefix="/v1", tags=["Documents"])

@router.get("/documents")
def list_documents():
    chunks = document_service.load_chunks()
    doc_map: Dict[str, Any] = {}
    for c in chunks:
        fn = c["filename"]
        if fn not in doc_map:
            doc_map[fn] = {
                "document_id": c["document_id"],
                "filename": fn,
                "chunks_count": 0,
                "version": c.get("document_version", 1)
            }
        doc_map[fn]["chunks_count"] += 1
    return {"count": len(doc_map), "documents": list(doc_map.values())}

@router.get("/documents/{document_id}/status")
def document_status(document_id: str):
    chunks = [c for c in document_service.load_chunks() if c["document_id"] == document_id]
    if not chunks:
        return {"status": "not_found", "document_id": document_id}
    return {
        "status": "indexed",
        "document_id": document_id,
        "filename": chunks[0]["filename"],
        "chunks_count": len(chunks)
    }

@router.get("/index/status")
def index_status():
    return document_service.get_status()

@router.post("/documents/index")
@router.post("/documents/reindex")
def reindex_documents():
    return document_service.reindex_all()
