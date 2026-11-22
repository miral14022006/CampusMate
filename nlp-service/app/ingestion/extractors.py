import os
import pypdf
import docx
from typing import List, Dict, Any
from app.core.logging import logger

def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract text per page from PDF using pypdf.
    Falls back to OCR (using pypdfium2 / pdf2image + pytesseract) if page has fewer than 40 characters.
    """
    pages_data = []
    try:
        reader = pypdf.PdfReader(file_path)
        for i, page in enumerate(reader.pages):
            page_num = i + 1
            text = page.extract_text() or ""
            text = text.strip()

            # Scanned detection heuristic: if text is too sparse, attempt OCR
            if len(text) < 40:
                ocr_text = try_ocr_page(file_path, page_num)
                if ocr_text:
                    text = ocr_text

            pages_data.append({
                "page": page_num,
                "text": text
            })
    except Exception as e:
        logger.error(f"Failed to extract PDF {file_path}: {e}")
    return pages_data

def try_ocr_page(pdf_path: str, page_num: int) -> str:
    """Run Tesseract OCR on a specific PDF page using pypdfium2 rendering or pdf2image."""
    try:
        import pytesseract
        image = None
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(pdf_path)
            page = pdf[page_num - 1]
            image = page.render(scale=2.0).to_pil()
        except Exception:
            try:
                import pdf2image
                images = pdf2image.convert_from_path(pdf_path, first_page=page_num, last_page=page_num)
                if images:
                    image = images[0]
            except Exception:
                pass

        if image:
            try:
                ocr_text = pytesseract.image_to_string(image, lang="eng+hin+guj")
            except Exception:
                ocr_text = pytesseract.image_to_string(image, lang="eng")
            return ocr_text.strip()
    except Exception as e:
        logger.warning(f"OCR fallback failed on {pdf_path} page {page_num}: {e}")
    return ""

def extract_text_from_docx(file_path: str) -> List[Dict[str, Any]]:
    """Extract paragraphs and tables from DOCX file."""
    pages_data = []
    try:
        doc = docx.Document(file_path)
        full_text = []
        for p in doc.paragraphs:
            if p.text.strip():
                full_text.append(p.text.strip())
        for table in doc.tables:
            for row in table.rows:
                row_str = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_str:
                    full_text.append(row_str)

        pages_data.append({
            "page": 1,
            "text": "\n".join(full_text)
        })
    except Exception as e:
        logger.error(f"Failed to extract DOCX {file_path}: {e}")
    return pages_data

def extract_text_from_txt(file_path: str) -> List[Dict[str, Any]]:
    """Extract plain text file."""
    pages_data = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read().strip()
            pages_data.append({
                "page": 1,
                "text": content
            })
    except Exception as e:
        logger.error(f"Failed to extract TXT {file_path}: {e}")
    return pages_data

def extract_document(file_path: str) -> List[Dict[str, Any]]:
    """Route document to appropriate extractor based on extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        return extract_text_from_docx(file_path)
    elif ext in [".txt", ".csv"]:
        return extract_text_from_txt(file_path)
    else:
        logger.warning(f"Unsupported file format: {ext}")
        return []
