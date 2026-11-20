import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from features.f08_ingest_api.parser import parse_document, chunk_text
from features.f09_ocr.engine import ocr_engine
from features.f01_hybrid_retrieval.bm25_retriever import bm25_retriever
from features.f01_hybrid_retrieval.dense_retriever import dense_retriever
from app.core.config import DATA_DIR, INDEX_DIR, CHUNKS_FILE

logger = logging.getLogger(__name__)

class DocumentIngestionManager:
    """
    Ingests new documents:
    - Parses PDF/DOCX/TXT, preserving PDF page numbers
    - Creates chunk metadata (carrying effective_date, version, topic_key, status)
    - Re-indexes or appends to BM25 and FAISS dense indexes
    - Generates new index_version
    """

    def __init__(self, data_dir: Optional[Path] = None):
        base = Path(data_dir) if data_dir else DATA_DIR
        self.raw_dir = base / "raw"
        self.processed_dir = base / "processed"
        self.index_dir = INDEX_DIR if not data_dir else (base / "index")
        self.chunks_file = CHUNKS_FILE if not data_dir else (self.processed_dir / "chunks.json")

    def _load_chunks(self) -> List[Dict[str, Any]]:
        if self.chunks_file.exists():
            try:
                with open(self.chunks_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def _save_chunks(self, chunks: List[Dict[str, Any]]):
        self.chunks_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.chunks_file, "w", encoding="utf-8") as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)

    def _extract_pages(self, path: Path) -> List[Dict[str, Any]]:
        """Returns [{page, text}] preserving PDF page boundaries when available."""
        if path.suffix.lower() == ".pdf":
            pdf_res = ocr_engine.process_pdf_document(path)
            return [
                {"page": p.get("page", idx + 1), "text": (p.get("text") or "").strip()}
                for idx, p in enumerate(pdf_res.get("pages", []))
            ]
        text = parse_document(path)
        return [{"page": 1, "text": text}] if text else []

    def ingest_file(
        self,
        file_path: str,
        title: str,
        topic_key: str,
        doc_type: str = "notice",
        version: int = 1,
        effective_date: Optional[str] = None,
        department: str = "Examination Cell",
        language: str = "en",
        replace_topic: bool = False
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

        pages = self._extract_pages(path)
        text_chunks: List[Dict[str, Any]] = []
        for page in pages:
            page_text = page["text"]
            if not page_text:
                continue
            for idx, chunk in enumerate(chunk_text(page_text, chunk_size=300, overlap=40), 1):
                text_chunks.append({
                    "page": page["page"],
                    "index_on_page": idx,
                    "text": chunk
                })

        full_text = "\n\n".join(p["text"] for p in pages if p["text"]).strip()
        text_length = len(full_text)
        text_preview = " ".join(full_text.split())[:200]

        extraction_warning = None
        if not text_chunks:
            extraction_warning = "No extractable text. The document may be a scanned/image PDF that needs OCR, or an unsupported encoding."
        elif text_preview.count("\ufffd") > 0:
            extraction_warning = "Extracted text contains replacement characters; encoding or OCR quality needs review."

        existing_chunks = self._load_chunks()
        if replace_topic:
            existing_chunks = [c for c in existing_chunks if c.get("topic_key") != topic_key]

        eff_date_str = effective_date or datetime.now().strftime("%Y-%m-%d")

        # If newer version of topic_key, mark prior chunks as superseded
        for c in existing_chunks:
            if c.get("topic_key") == topic_key and c.get("version", 1) < version:
                c["status"] = "superseded"

        new_chunk_records = []
        base_name = path.name

        for item in text_chunks:
            chunk_rec = {
                "chunk_id": f"{topic_key}_v{version}_p{item['page']}_c{item['index_on_page']}",
                "doc_name": base_name,
                "title": title,
                "topic_key": topic_key,
                "doc_type": doc_type,
                "page": item["page"],
                "effective_date": eff_date_str,
                "upload_date": datetime.now().strftime("%Y-%m-%d"),
                "version": version,
                "status": "active",
                "department": department,
                "language": language,
                "text": item["text"]
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
            "status": "success" if new_chunk_records else "no_text",
            "chunks_created": len(new_chunk_records),
            "total_chunks": len(all_chunks),
            "new_index_version": new_index_version,
            "calendar_candidates": calendar_candidates,
            "pages": len(pages),
            "text_length": text_length,
            "text_preview": text_preview,
            "extraction_warning": extraction_warning
        }

    def rebuild_indexes(self):
        """Re-indexes BM25 and dense FAISS from active chunks and hot-reloads them."""
        chunks = [c for c in self._load_chunks() if c.get("status", "active") == "active"]

        # Build BM25
        try:
            bm25_retriever.chunks = chunks
            bm25_retriever.build_index()
            bm25_retriever.load_index()
        except Exception as e:
            logger.warning(f"BM25 rebuild warning: {e}")

        # Build Dense
        try:
            dense_retriever.chunks = chunks
            dense_retriever.build_index()
            dense_retriever.load_index()
        except Exception as e:
            logger.warning(f"Dense rebuild warning: {e}")

ingest_manager = DocumentIngestionManager()
