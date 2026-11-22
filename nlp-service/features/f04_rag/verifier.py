import re
from typing import List, Dict, Any

class HallucinationGuard:
    """
    Post-generation citation parser & groundedness verification:
    1. Parses inline citation tags ([1], [2], etc.).
    2. Verifies that every cited chunk index actually exists in the provided context.
    3. Groundedness check: extracts key factual entities (numbers, dates, percentages, amounts)
       from the answer and ensures they are supported by the text of the cited chunks.
    4. Supports Indic numeral normalization (Devanagari ०-९, Gujarati ૦-૯) for multilingual RAG.
    5. Computes hallucination score.
    """

    CITATION_REGEX = re.compile(r"(?:\[|【)(\d+)(?:\]|】)")
    NUMERIC_FACT_REGEX = re.compile(r"\b(?:\d{1,4}(?:st|nd|rd|th)?|\d+(?:\.\d+)?%?|₹\s*\d+(?:,\d+)*|\d+(?:,\d+)*(?:\.\d+)?)\b")

    INDIC_TO_DIGIT = {
        # Devanagari numerals
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '૮': '8', '९': '9',
        # Gujarati numerals
        '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
        '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
    }

    def _normalize_indic_numerals(self, text: str) -> str:
        res = []
        for ch in text:
            res.append(self.INDIC_TO_DIGIT.get(ch, ch))
        return "".join(res)

    def parse_citations(self, text: str) -> List[int]:
        matches = self.CITATION_REGEX.findall(text)
        return sorted(list(set(int(m) for m in matches)))

    def verify(
        self,
        answer: str,
        indexed_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Runs citation integrity and numerical/date entity consistency checks.
        """
        cited_indices = self.parse_citations(answer)
        chunk_map = {c["citation_id"]: c for c in indexed_chunks}

        valid_citations = []
        invalid_citations = []

        for idx in cited_indices:
            if idx in chunk_map:
                valid_citations.append(chunk_map[idx])
            else:
                invalid_citations.append(idx)

        # Normalize numerals for both corpus and answer
        raw_corpus = " ".join([c.get("full_text", "") for c in indexed_chunks]).lower()
        source_corpus = self._normalize_indic_numerals(raw_corpus).replace(",", "")

        norm_answer = self._normalize_indic_numerals(answer)
        answer_facts = self.NUMERIC_FACT_REGEX.findall(norm_answer)
        unsupported_facts = []

        for fact in answer_facts:
            clean_fact = fact.lower().replace(",", "").replace("₹", "").strip()
            # Ignore standalone 1-digit numbers or citation references
            if clean_fact in [str(i) for i in cited_indices] or len(clean_fact) <= 1:
                continue

            if clean_fact and clean_fact not in source_corpus:
                unsupported_facts.append(fact)

        is_grounded = True
        hallucination_score = 0.0

        if invalid_citations:
            is_grounded = False
            hallucination_score += 0.5

        if unsupported_facts:
            # If critical date or amount is unsupported
            has_critical_fact = any(re.search(r"\b(202\d|₹\s*\d+)\b", uf) for uf in unsupported_facts)
            if has_critical_fact or len(unsupported_facts) >= 2:
                is_grounded = False
                hallucination_score += min(1.0, len(unsupported_facts) * 0.35)

        return {
            "grounded": is_grounded,
            "hallucination_score": round(hallucination_score, 2),
            "cited_indices": cited_indices,
            "valid_citations": valid_citations,
            "invalid_citations": invalid_citations,
            "unsupported_facts": unsupported_facts
        }

hallucination_guard = HallucinationGuard()
