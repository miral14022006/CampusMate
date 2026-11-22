import os
import json
import glob
from typing import List, Dict, Any
from app.core.config import settings
from app.core.logging import logger
from app.ingestion.extractors import extract_document
from app.ingestion.chunker import chunk_document_pages
from app.retrieval.tfidf_retriever import tfidf_retriever
from app.retrieval.bm25_retriever import bm25_retriever
from app.retrieval.dense_retriever import dense_retriever

class DocumentIndexService:
    def __init__(self):
        self.chunks_file = os.path.join(settings.INDEX_DIR, "chunks.json")
        self.chunks: List[Dict[str, Any]] = []

    def load_chunks(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.chunks_file):
            try:
                with open(self.chunks_file, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                    return self.chunks
            except Exception as e:
                logger.error(f"Failed to read chunks file: {e}")
        return []

    def get_status(self) -> Dict[str, Any]:
        chunks = self.load_chunks()
        doc_count = len(set(c["filename"] for c in chunks)) if chunks else 0
        return {
            "status": "ready" if chunks else "empty",
            "chunks_count": len(chunks),
            "documents_indexed": doc_count,
            "faiss_index_exists": os.path.exists(os.path.join(settings.INDEX_DIR, "faiss_index.bin")),
            "bm25_index_exists": os.path.exists(os.path.join(settings.INDEX_DIR, "bm25.pkl")),
            "tfidf_index_exists": os.path.exists(os.path.join(settings.INDEX_DIR, "tfidf_retrieval.joblib"))
        }

    def reindex_all(self) -> Dict[str, Any]:
        """Scan uploads directory, extract, chunk, and rebuild TF-IDF, BM25, and FAISS."""
        logger.info(f"Re-indexing all documents from {settings.UPLOADS_DIR}...")
        all_chunks: List[Dict[str, Any]] = []

        files = glob.glob(os.path.join(settings.UPLOADS_DIR, "*"))
        valid_files = [f for f in files if os.path.isfile(f) and not os.path.basename(f).startswith(".")]

        for filepath in valid_files:
            filename = os.path.basename(filepath)
            doc_id = filename.replace(".", "_")
            pages = extract_document(filepath)
            if not pages:
                continue

            doc_chunks = chunk_document_pages(pages, doc_id=doc_id, filename=filename)
            all_chunks.extend(doc_chunks)

        self.chunks = all_chunks

        # Build all three indices
        tfidf_retriever.build_index(all_chunks)
        bm25_retriever.build_index(all_chunks)
        dense_retriever.build_index(all_chunks)

        return {
            "status": "success",
            "documents_processed": len(valid_files),
            "total_chunks_indexed": len(all_chunks)
        }

document_service = DocumentIndexService()
