import os
import re
import hashlib
from pathlib import Path
from typing import Dict, Any, List

from features.f09_ocr.engine import ocr_engine

def parse_document(file_path: Path) -> str:
    """Extracts text from TXT, DOCX, PDF, or image files (JPG, PNG) with OCR fallback."""
    ext = file_path.suffix.lower()
    text = ""

    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    elif ext == ".docx":
        import docx
        doc = docx.Document(str(file_path))
        text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    elif ext == ".pdf":
        # Check text layer, run OCR if scanned
        pdf_res = ocr_engine.process_pdf_document(file_path)
        text = pdf_res["full_text"]
    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".tiff"]:
        # Direct image OCR
        img_res = ocr_engine.extract_image_ocr(file_path)
        text = img_res["text"]
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    return text.strip()

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Splits document text into overlapping chunks."""
    if not text:
        return []
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        if i + chunk_size >= len(words):
            break
        i += (chunk_size - overlap)
    return chunks
