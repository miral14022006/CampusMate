import re
import json
from typing import List, Dict, Any, Optional
from app.config import TEMPLATES_DIR
from app.modules.preprocessing import preprocessor

class AnswerTemplater:
    def __init__(self):
        self.templates = self._load_templates()

    def _load_templates(self) -> Dict[str, Dict[str, str]]:
        template_file = TEMPLATES_DIR / "intent_responses.json"
        if template_file.exists():
            try:
                with open(template_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Answer] Error loading templates: {e}")
                return {}
        return {}

    def extract_best_sentence(self, query: str, chunk_text: str) -> Optional[str]:
        """Extractive: picks the sentence from the top chunk having highest token overlap with query."""
        if not chunk_text:
            return None

        # Split chunk into sentences
        sentences = re.split(r'(?<=[.!?।])\s+', chunk_text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 15]
        if not sentences:
            return chunk_text[:250]

        query_tokens = set(preprocessor.tokenize(query.lower()))
        best_sentence = None
        best_overlap = -1

        for sent in sentences:
            sent_tokens = set(preprocessor.tokenize(sent.lower()))
            overlap = len(query_tokens.intersection(sent_tokens))
            if overlap > best_overlap:
                best_overlap = overlap
                best_sentence = sent

        return best_sentence if best_overlap > 0 else sentences[0]

    def generate_answer(
        self,
        query: str,
        intent: str,
        language: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesizes response adhering to user language.
        Always returns source document attribution.
        """
        # Map detected dialect to template language bucket:
        # 'hi-Latn' (Hinglish) -> 'en' / 'hi' friendly template
        # 'gu-Latn' (Gujlish) -> 'gu' template
        lang_key = "en"
        if language in ["hi", "hi-Latn"]:
            lang_key = "hi" if language == "hi" else "en"
        elif language in ["gu", "gu-Latn"]:
            lang_key = "gu"

        source_doc = None
        top_chunk = retrieved_chunks[0] if retrieved_chunks else None

        # Extractive fallback must use the retrieved evidence even when the raw
        # RRF/reranker score is below the old template threshold. That threshold
        # caused LLM failures to surface the generic "student affairs" answer.
        if top_chunk and (top_chunk.get("text") or "").strip():
            source_doc = top_chunk["doc_name"]
            extracted = self.extract_best_sentence(query, top_chunk["text"])
            return {
                "answer": extracted,
                "source_doc": source_doc,
                "mode": "extractive"
            }

        # Otherwise use template mapped by intent and language
        lang_templates = self.templates.get(lang_key, self.templates.get("en", {}))
        answer = lang_templates.get(intent)

        if not answer:
            # Fallback to English template
            answer = self.templates.get("en", {}).get(
                intent,
                "For detailed information on this topic, please contact the student affairs office."
            )

        if top_chunk:
            source_doc = top_chunk.get("doc_name")

        return {
            "answer": answer,
            "source_doc": source_doc or None,
            "mode": "template"
        }

answer_templater = AnswerTemplater()

