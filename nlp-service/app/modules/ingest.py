import os
import json
import datetime
from pathlib import Path
from typing import List, Dict, Any

from app.config import RAW_DOCS_DIR, DATA_DIR

# Optional docx and pdf dependencies
try:
    import docx
    DOCX_AVAILABLE = True
except Exception:
    DOCX_AVAILABLE = False

try:
    import pypdf
    PYPDF_AVAILABLE = True
except Exception:
    PYPDF_AVAILABLE = False

class DocumentIngester:
    def __init__(self, chunk_size: int = 400, overlap: int = 50):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def extract_text_from_txt(self, file_path: Path) -> List[Dict[str, Any]]:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return [{"page": 1, "text": content}]

    def extract_text_from_docx(self, file_path: Path) -> List[Dict[str, Any]]:
        if not DOCX_AVAILABLE:
            return []
        doc = docx.Document(file_path)
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        return [{"page": 1, "text": full_text}]

    def extract_text_from_pdf(self, file_path: Path) -> List[Dict[str, Any]]:
        if not PYPDF_AVAILABLE:
            return []
        pages_content = []
        reader = pypdf.PdfReader(str(file_path))
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_content.append({"page": idx + 1, "text": text})
        return pages_content

    def chunk_text(self, text: str, doc_name: str, page: int) -> List[Dict[str, Any]]:
        # Split by paragraph first
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        chunk_counter = 1

        for p in paragraphs:
            # If paragraph exceeds chunk size, split by sentence or window
            words = p.split()
            if len(words) <= self.chunk_size:
                chunks.append({
                    "chunk_id": f"{doc_name}_p{page}_c{chunk_counter}",
                    "doc_name": doc_name,
                    "page": page,
                    "text": p,
                    "upload_date": datetime.date.today().isoformat()
                })
                chunk_counter += 1
            else:
                step = self.chunk_size - self.overlap
                for i in range(0, len(words), step):
                    chunk_slice = " ".join(words[i:i + self.chunk_size])
                    chunks.append({
                        "chunk_id": f"{doc_name}_p{page}_c{chunk_counter}",
                        "doc_name": doc_name,
                        "page": page,
                        "text": chunk_slice,
                        "upload_date": datetime.date.today().isoformat()
                    })
                    chunk_counter += 1

        return chunks

    def process_all_raw_docs(self) -> List[Dict[str, Any]]:
        all_chunks = []
        raw_files = list(RAW_DOCS_DIR.glob("*"))

        for file_path in raw_files:
            doc_name = file_path.name
            pages = []
            suffix = file_path.suffix.lower()

            if suffix == ".txt":
                pages = self.extract_text_from_txt(file_path)
            elif suffix == ".docx":
                pages = self.extract_text_from_docx(file_path)
            elif suffix == ".pdf":
                pages = self.extract_text_from_pdf(file_path)

            for page_info in pages:
                doc_chunks = self.chunk_text(page_info["text"], doc_name, page_info["page"])
                all_chunks.extend(doc_chunks)

        # Persist processed chunks
        processed_file = DATA_DIR / "processed" / "chunks.json"
        processed_file.parent.mkdir(parents=True, exist_ok=True)
        with open(processed_file, "w", encoding="utf-8") as f:
            json.dump(all_chunks, f, indent=2, ensure_ascii=False)

        print(f"[Ingest] Ingested {len(raw_files)} documents into {len(all_chunks)} chunks -> {processed_file}")
        return all_chunks

ingester = DocumentIngester()

if __name__ == "__main__":
    ingester.process_all_raw_docs()

