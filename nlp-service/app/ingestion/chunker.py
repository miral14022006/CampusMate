import re
from typing import List, Dict, Any
from app.nlp.preprocessing import clean_text

def chunk_document_pages(
    pages: List[Dict[str, Any]],
    doc_id: str,
    filename: str,
    chunk_size: int = 500,
    chunk_overlap: int = 80
) -> List[Dict[str, Any]]:
    """
    Chunk document preserving page numbers, sentence boundaries, and metadata.
    Avoids splitting tables and date-critical structures unnecessarily.
    """
    chunks = []
    chunk_idx = 1

    for page_data in pages:
        page_num = page_data.get("page", 1)
        raw_text = page_data.get("text", "")
        text = clean_text(raw_text)
        if not text:
            continue

        # Split into sentence/line units
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if not lines:
            continue

        current_chunk_lines = []
        current_len = 0

        for line in lines:
            line_len = len(line)
            if current_len + line_len > chunk_size and current_chunk_lines:
                chunk_content = " ".join(current_chunk_lines)
                chunks.append({
                    "chunk_id": f"{doc_id}_p{page_num}_c{chunk_idx}",
                    "document_id": doc_id,
                    "filename": filename,
                    "page_number": page_num,
                    "content": chunk_content,
                    "document_version": 1
                })
                chunk_idx += 1

                # Overlap retention: keep last line if reasonable
                if current_chunk_lines and len(current_chunk_lines[-1]) < chunk_overlap:
                    current_chunk_lines = [current_chunk_lines[-1], line]
                    current_len = len(current_chunk_lines[0]) + line_len
                else:
                    current_chunk_lines = [line]
                    current_len = line_len
            else:
                current_chunk_lines.append(line)
                current_len += line_len

        # Flush remainder
        if current_chunk_lines:
            chunk_content = " ".join(current_chunk_lines)
            chunks.append({
                "chunk_id": f"{doc_id}_p{page_num}_c{chunk_idx}",
                "document_id": doc_id,
                "filename": filename,
                "page_number": page_num,
                "content": chunk_content,
                "document_version": 1
            })
            chunk_idx += 1

    return chunks
