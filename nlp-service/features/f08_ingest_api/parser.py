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
    """Detects whether a line belongs to a table, schedule, or columnar data."""
    stripped = line.strip()
    if not stripped:
        return False
    # Markdown table or pipe-separated
    if "|" in stripped and len(stripped.split("|")) >= 2:
        return True
    # Tab separated columns
    if "\t" in stripped:
        return True
    # Columnar spacing (2 or more spaces separating words or dates)
    if re.search(r'\w+\s{2,}\d{1,2}(?:st|nd|rd|th)?\s+\w+', stripped):
        return True
    return False


def _split_into_sentences(text: str) -> List[str]:
    """Splits text into sentences preserving Hindi purna viram (।) and standard delimiters."""
    sentence_delims = re.compile(r'(?<=[.!?।॥])\s+')
    raw_sents = sentence_delims.split(text)
    return [s.strip() for s in raw_sents if s.strip()]


def chunk_text(
    text: str,
    chunk_size: int = 350,
    overlap: int = 40,
    max_chunk_words: int = 500
) -> List[str]:
    """
    Intelligent sentence-aware and table/line-preserving text chunker.
    - Preserves newlines and row structures so tabular dates and events are never flattened into run-on sentences.
    - Respects paragraph boundaries (\n\n) and sentence boundaries.
    - Maintains line breaks between schedule items.
    """
    if not text or not text.strip():
        return []

    lines = [l.rstrip() for l in text.split("\n") if l.strip()]
    if not lines:
        return []

    chunks: List[str] = []
    current_lines: List[str] = []
    current_word_count = 0

    for line in lines:
        line_word_count = len(line.split())
        if not line_word_count:
            continue

        # If a single line is extraordinarily long (a wall of text), split by sentences
        if line_word_count > max_chunk_words:
            sents = _split_into_sentences(line)
            for sent in sents:
                sent_words = len(sent.split())
                if current_word_count + sent_words > chunk_size and current_lines:
                    chunks.append("\n".join(current_lines))
                    # Retain last line or sentence for overlap
                    current_lines = [current_lines[-1]] if current_lines else []
                    current_word_count = sum(len(l.split()) for l in current_lines)
                current_lines.append(sent)
                current_word_count += sent_words
            continue

        if current_word_count + line_word_count > chunk_size and current_lines:
            chunks.append("\n".join(current_lines))
            # Overlap: keep the last 1-2 lines for context continuity
            overlap_lines: List[str] = []
            ov_words = 0
            for prev_l in reversed(current_lines):
                lw = len(prev_l.split())
                if ov_words + lw <= overlap or not overlap_lines:
                    overlap_lines.insert(0, prev_l)
                    ov_words += lw
                else:
                    break
            current_lines = overlap_lines + [line]
            current_word_count = sum(len(l.split()) for l in current_lines)
        else:
            current_lines.append(line)
            current_word_count += line_word_count

    if current_lines:
        chunks.append("\n".join(current_lines))

    return chunks
