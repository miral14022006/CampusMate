import io
import shutil
import logging
import numpy as np
import cv2
from pathlib import Path
from typing import Dict, Any
from PIL import Image

from features.f09_ocr.preprocessor import image_preprocessor
from features.f09_ocr.cleaner import post_ocr_cleaner

logger = logging.getLogger(__name__)

class OCREngine:
    """
    Multilingual Optical Character Recognition Engine (English + Hindi + Gujarati).
    - Checks for embedded text layer in PDF pages; falls back to OCR if empty/scanned.
    - Applies OpenCV preprocessing (grayscale, bilateral/Gaussian denoise, Otsu threshold, deskew).
    - Runs Tesseract OCR via pytesseract (with graceful fallback if tesseract binary is not on host).
    - Post-OCR cleaning and per-page confidence scoring.
    """

    CONFIDENCE_THRESHOLD = 70.0 # Pages below this need human review

    def __init__(self, languages: str = "eng+hin+guj"):
        self.languages = languages
        self.tesseract_available = shutil.which("tesseract") is not None

    def has_text_layer(self, text: str, min_words: int = 15) -> bool:
        """Determines if extracted digital text layer is sufficient."""
        if not text:
            return False
        words = [w for w in text.split() if len(w) > 1]
        return len(words) >= min_words

    def extract_image_ocr(
        self,
        image_input,
        apply_preprocessing: bool = True
    ) -> Dict[str, Any]:
        """
        Executes OCR on an image file path or numpy array.
        """
        # Load image into numpy array
        if isinstance(image_input, (str, Path)):
            img = cv2.imread(str(image_input))
            if img is None:
                pil_img = Image.open(str(image_input)).convert("RGB")
                img = np.array(pil_img)
        elif isinstance(image_input, Image.Image):
            img = np.array(image_input.convert("RGB"))
        else:
            img = image_input

        # 1. Preprocess with OpenCV
        processed_img, skew_angle = image_preprocessor.preprocess(
            img, apply_pipeline=apply_preprocessing
        )

        raw_text = ""
        confidence = 85.0 # default baseline confidence

        # 2. Run OCR via pytesseract if available
        if self.tesseract_available:
            try:
                import pytesseract
                # Convert back to PIL Image for pytesseract
                pil_to_ocr = Image.fromarray(processed_img)
                data = pytesseract.image_to_data(
                    pil_to_ocr,
                    lang=self.languages,
                    output_type=pytesseract.Output.DICT
                )
                raw_text = " ".join([w for w in data.get("text", []) if w.strip()])

                # Calculate mean word confidence
                conf_values = [
                    float(c) for c in data.get("conf", [])
                    if str(c).replace("-", "").isdigit() and float(c) > 0
                ]
                if conf_values:
                    confidence = round(sum(conf_values) / len(conf_values), 2)
            except Exception as e:
                logger.warn(f"Pytesseract execution error: {e}")
                raw_text = ""

        # Never fabricate text when OCR is unavailable or yields nothing. The caller
        # must flag the document for human review / OCR setup instead.
        if not raw_text:
            confidence = 0.0

        # 3. Post-OCR Cleanup
        cleaned_text = post_ocr_cleaner.clean(raw_text)

        needs_review = confidence < self.CONFIDENCE_THRESHOLD

        return {
            "text": cleaned_text,
            "raw_text": raw_text,
            "confidence": confidence,
            "skew_angle": skew_angle,
            "preprocessing_applied": apply_preprocessing,
            "needs_human_review": needs_review,
            "languages": self.languages
        }

    def process_pdf_document(
        self,
        pdf_path: Path,
        apply_preprocessing: bool = True
    ) -> Dict[str, Any]:
        """
        Parses PDF: checks text layer on each page.
        If missing, rasterizes and runs multilingual OCR.
        """
        import pypdf

        reader = pypdf.PdfReader(str(pdf_path))
        pages_result = []
        full_text_parts = []
        any_low_confidence = False

        for page_idx, page in enumerate(reader.pages, 1):
            digital_text = page.extract_text() or ""
            if self.has_text_layer(digital_text):
                full_text_parts.append(digital_text.strip())
                pages_result.append({
                    "page": page_idx,
                    "method": "digital_text_layer",
                    "text": digital_text.strip(),
                    "confidence": 100.0,
                    "needs_human_review": False
                })
            else:
                # Scanned page: Attempt extraction from embedded images, rasterization & OCR
                logger.info(f"Page {page_idx} lacks digital text layer. Rasterizing for OCR...")
                ocr_text = ""
                ocr_conf = 80.0
                needs_review = False

                # 1. First check if the page contains embedded images directly in the PDF
                if hasattr(page, "images") and len(page.images) > 0:
                    for img_obj in page.images:
                        try:
                            pil_img = Image.open(io.BytesIO(img_obj.data))
                            ocr_res = self.extract_image_ocr(pil_img, apply_preprocessing=apply_preprocessing)
                            if ocr_res["text"]:
                                ocr_text += ocr_res["text"] + "\n"
                                ocr_conf = ocr_res["confidence"]
                        except Exception as img_err:
                            logger.warn(f"Embedded image extraction error: {img_err}")

                # 2. If embedded image extraction produced nothing, attempt pdf2image rasterization
                if not ocr_text.strip():
                    try:
                        from pdf2image import convert_from_path
                        images = convert_from_path(str(pdf_path), first_page=page_idx, last_page=page_idx, dpi=300)
                        if images:
                            ocr_res = self.extract_image_ocr(images[0], apply_preprocessing=apply_preprocessing)
                            ocr_text = ocr_res["text"]
                            ocr_conf = ocr_res["confidence"]
                            needs_review = ocr_res["needs_human_review"]
                    except Exception as e:
                        logger.warn(f"pdf2image rasterization unavailable: {e}")
                        needs_review = True

                if not ocr_text.strip():
                    ocr_text = ""
                    needs_review = True

                if needs_review:
                    any_low_confidence = True

                full_text_parts.append(ocr_text.strip())
                pages_result.append({
                    "page": page_idx,
                    "method": "ocr_rasterized",
                    "text": ocr_text.strip(),
                    "confidence": ocr_conf,
                    "needs_human_review": needs_review
                })

        return {
            "full_text": "\n\n".join(full_text_parts),
            "pages": pages_result,
            "total_pages": len(pages_result),
            "needs_human_review": any_low_confidence
        }

ocr_engine = OCREngine()

