import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from features.f08_ingest_api.parser import parse_document, chunk_text
from features.f01_hybrid_retrieval.bm25_retriever import bm25_retriever
from features.f01_hybrid_retrieval.dense_retriever import dense_retriever

logger = logging.getLogger(__name__)

class DocumentIngestionManager:
    """
    Ingests new documents:
    - Parses PDF/DOCX/TXT
    - Creates chunk metadata (carrying effective_date, version, topic_key, status)
    - Re-indexes or appends to BM25 and FAISS dense indexes
    - Generates new index_version
    """

    def __init__(self, data_dir: Optional[Path] = None):
        base = data_dir or (Path(__file__).resolve().parent.parent.parent / "data")
        self.raw_dir = base / "raw"
        self.processed_dir = base / "processed"
        self.index_dir = base / "index"
        self.chunks_file = self.processed_dir / "chunks.json"

    def _load_chunks(self) -> List[Dict[str, Any]]:
        if self.chunks_file.exists():
            try:
                with open(self.chunks_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def _save_chunks(self, chunks: List[Dict[str, Any]]):
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        with open(self.chunks_file, "w", encoding="utf-8") as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)

    def ingest_file(
        self,
        file_path: str,
        title: str,
        topic_key: str,
        doc_type: str = "notice",
        version: int = 1,
        effective_date: Optional[str] = None,
        department: str = "Examination Cell",
        language: str = "en"
    ) -> Dict[str, Any]:
        path = Path(file_path)
        # Check alternative locations if running across container volume boundaries
        if not path.exists():
            candidate_paths = [
                Path("/data/uploads") / path.name,
                Path("/app/data/uploads") / path.name,
                Path("data/uploads") / path.name
            ]
            for cp in candidate_paths:
                if cp.exists():
                    path = cp
                    break
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        raw_text = parse_document(path)
        text_chunks = chunk_text(raw_text, chunk_size=300, overlap=40)

        existing_chunks = self._load_chunks()

        eff_date_str = effective_date or datetime.now().strftime("%Y-%m-%d")

        # If newer version of topic_key, mark prior chunks as superseded
        for c in existing_chunks:
            if c.get("topic_key") == topic_key and c.get("version", 1) < version:
                c["status"] = "superseded"

        new_chunk_records = []
        base_name = path.name

        for idx, chunk in enumerate(text_chunks, 1):
            chunk_rec = {
                "chunk_id": f"{topic_key}_v{version}_{idx}",
                "doc_name": base_name,
                "title": title,
                "topic_key": topic_key,
                "doc_type": doc_type,
                "page": 1,
                "effective_date": eff_date_str,
                "upload_date": datetime.now().strftime("%Y-%m-%d"),
                "version": version,
                "status": "active",
                "department": department,
                "language": language,
                "text": chunk
            }
            new_chunk_records.append(chunk_rec)

        all_chunks = existing_chunks + new_chunk_records
        self._save_chunks(all_chunks)

        # Trigger index rebuild or incremental update
        new_index_version = f"idx_{int(datetime.now().timestamp())}"
        self.rebuild_indexes()

        # Hook 1: Call calendar extractor on new chunks to find candidate events
        calendar_candidates = []
        try:
            from config.settings import is_feature_enabled
            if is_feature_enabled("calendar", True):
                from features.f15_calendar_events.extractor import calendar_extractor
                for cr in new_chunk_records:
                    evs = calendar_extractor.extract_dates_from_text(
                        text=cr["text"],
                        doc_name=cr["doc_name"],
                        page=cr.get("page", 1),
                        chunk_id=cr["chunk_id"],
                        effective_date=cr.get("effective_date")
                    )
                    calendar_candidates.extend(evs)
        except Exception as e:
            logger.warning(f"Calendar extraction hook in ingest failed: {e}")

        return {
            "status": "success",
            "chunks_created": len(new_chunk_records),
            "total_chunks": len(all_chunks),
            "new_index_version": new_index_version,
            "calendar_candidates": calendar_candidates
        }

    def rebuild_indexes(self):
        """Re-indexes BM25 and dense FAISS from active chunks and hot-reloads them."""
        # Build BM25
        try:
            bm25_retriever.build_index()
            bm25_retriever.load_index()
        except Exception as e:
            logger.warning(f"BM25 rebuild warning: {e}")

        # Build Dense
        try:
            dense_retriever.build_index()
            dense_retriever.load_index()
        except Exception as e:
            logger.warning(f"Dense rebuild warning: {e}")

ingest_manager = DocumentIngestionManager()
