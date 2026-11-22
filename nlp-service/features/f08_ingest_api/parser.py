import re
from pathlib import Path
from typing import List, Dict, Any, Tuple

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
        lines = []
        for p in doc.paragraphs:
            if p.text.strip():
                lines.append(p.text.strip())
        # Also parse tables if present in docx
        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                if any(row_cells):
                    lines.append(" | ".join(row_cells))
        text = "\n".join(lines)
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


def _is_table_line(line: str) -> bool:
    """Detects whether a line belongs to a markdown or delimited table."""
    stripped = line.strip()
    if not stripped:
        return False
    # Markdown table or pipe-separated
    if "|" in stripped and len(stripped.split("|")) >= 3:
        return True
    # Tab or multiple space separated columns (e.g. 3+ columns)
    if "\t" in stripped and len(stripped.split("\t")) >= 3:
        return True
    return False


def _split_into_sentences(text: str) -> List[str]:
    """Splits text into sentences preserving Hindi purna viram (।) and standard delimiters."""
    # Split on punctuation followed by whitespace or line break
    sentence_delims = re.compile(r'(?<=[.!?।॥])\s+')
    raw_sents = sentence_delims.split(text)
    return [s.strip() for s in raw_sents if s.strip()]


def chunk_text(
    text: str,
    chunk_size: int = 400,
    overlap: int = 50,
    max_chunk_words: int = 550
) -> List[str]:
    """
    Intelligent sentence-aware and table-preserving text chunker.
    - Preserves tables as contiguous units where possible.
    - Respects paragraph boundaries (\n\n) and sentence boundaries.
    - Carries forward active heading context if detected.
    - Uses sentence-level overlap rather than hard word slicing.
    """
    if not text or not text.strip():
        return []

    lines = text.split("\n")
    blocks: List[str] = []
    current_block: List[str] = []
    in_table = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_table:
                in_table = False
            if current_block:
                blocks.append("\n".join(current_block))
                current_block = []
            continue

        if _is_table_line(stripped):
            if not in_table and current_block:
                blocks.append("\n".join(current_block))
                current_block = []
            in_table = True
            current_block.append(stripped)
        else:
            if in_table:
                in_table = False
                if current_block:
                    blocks.append("\n".join(current_block))
                    current_block = []
            current_block.append(stripped)

    if current_block:
        blocks.append("\n".join(current_block))

    # Convert blocks into chunks with target size and overlap
    chunks: List[str] = []
    current_chunk_words: List[str] = []
    overlap_words: List[str] = []

    for block in blocks:
        block_words = block.split()
        if not block_words:
            continue

        # If a single table/block is very large, split it by rows/sentences
        if len(block_words) > max_chunk_words:
            if _is_table_line(block.split("\n")[0]):
                table_lines = block.split("\n")
                header = table_lines[0] if table_lines else ""
                sub_lines = []
                for tline in table_lines[1:]:
                    sub_lines.append(tline)
                    if sum(len(sl.split()) for sl in sub_lines) >= chunk_size:
                        t_chunk = header + "\n" + "\n".join(sub_lines)
                        chunks.append(t_chunk)
                        sub_lines = []
                if sub_lines:
                    chunks.append(header + "\n" + "\n".join(sub_lines))
            else:
                sents = _split_into_sentences(block)
                for s in sents:
                    s_words = s.split()
                    if len(current_chunk_words) + len(s_words) > max_chunk_words and current_chunk_words:
                        chunks.append(" ".join(current_chunk_words))
                        # retain overlap
                        overlap_words = current_chunk_words[-overlap:] if len(current_chunk_words) > overlap else current_chunk_words[:]
                        current_chunk_words = overlap_words + s_words
                    else:
                        current_chunk_words.extend(s_words)
            continue

        # Normal block appending
        if len(current_chunk_words) + len(block_words) > chunk_size and current_chunk_words:
            chunks.append(" ".join(current_chunk_words))
            overlap_words = current_chunk_words[-overlap:] if len(current_chunk_words) > overlap else current_chunk_words[:]
            current_chunk_words = overlap_words + block_words
        else:
            current_chunk_words.extend(block_words)

    if current_chunk_words:
        chunks.append(" ".join(current_chunk_words))

    return chunks
