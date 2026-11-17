import re
import logging
from typing import List, Dict, Any, Optional

from features.f04_rag.schemas import RAGResponse, CitationItem
from features.f04_rag.prompt_builder import prompt_builder
from features.f04_rag.verifier import hallucination_guard
from features.f14_synthetic_data.llm import get_llm_provider
from app.modules.answer_template import answer_templater

logger = logging.getLogger(__name__)

class RAGEngine:
    """
    Production RAG Engine with:
    1. Evidence strength gate (rejects low retrieval scores before LLM call).
    2. Date conflict resolution hook (prioritizes newer chunk timestamps).
    3. Grounded generation via pluggable LLM interface.
    4. Post-generation verification & citation validation.
    5. Fallback to extractive answer or multilingual "I don't know".
    """

    IDK_MESSAGES = {
        "en": "I'm sorry, but the official college documents do not contain sufficient information to answer this question. Please reach out to the campus helpdesk for assistance.",
        "hi": "क्षमा करें, आधिकारिक कॉलेज दस्तावेजों में इस प्रश्न का उत्तर देने के लिए पर्याप्त जानकारी नहीं है। कृपया सहायता के लिए कॉलेज हेल्पडेस्क से संपर्क करें।",
        "gu": "માફ કરશો, સત્તાવાર કૉલેજ દસ્તાવેજોમાં આ પ્રશ્નનો જવાબ આપવા માટે પૂરતી માહિતી ઉપલબ્ધ નથી. કૃપા કરીને સહાય માટે કૉલેજ હેલ્પડેસ્કનો સંપર્ક કરો.",
        "hi-Latn": "Sorry, official college documents mein is sawaal ka answer provide karne ke liye sufficient information available nahi hai. Please campus helpdesk se contact karein."
    }

    def __init__(
        self,
        min_evidence_score: float = 0.005,
        llm_provider_name: str = "mock"
    ):
        self.min_evidence_score = min_evidence_score
        self.llm_provider_name = llm_provider_name
        self._llm = None

    def _get_llm(self):
        if self._llm is None:
            self._llm = get_llm_provider(self.llm_provider_name)
        return self._llm

    def resolve_date_conflicts(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Date-conflict hook: When chunks come from different dates or doc revisions,
        sort by upload_date descending while preserving high relevance.
        """
        return sorted(chunks, key=lambda c: (c.get("upload_date", "2024-01-01"), c.get("score", 0.0)), reverse=True)

    def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        language: str = "en",
        intent: str = "general_queries",
        mock_llm_response: Optional[str] = None
    ) -> RAGResponse:
        """
        Executes grounded generation workflow with gating and verification.
        """
        lang_key = language if language in ["hi", "gu", "hi-Latn"] else "en"

        # 1. Evidence Strength Gate: Check if retrieval found relevant evidence
        top_score = max([c.get("score", 0.0) for c in retrieved_chunks], default=0.0)
        if not retrieved_chunks or top_score < self.min_evidence_score:
            return RAGResponse(
                answer=self.IDK_MESSAGES.get(lang_key, self.IDK_MESSAGES["en"]),
                language=language,
                citations=[],
                grounded=True,
                mode="idk",
                hallucination_score=0.0,
                verification_details={"reason": f"Top retrieval score {top_score:.4f} is below evidence threshold {self.min_evidence_score}"}
            )

        # 2. Date-conflict ordering
        ordered_chunks = self.resolve_date_conflicts(retrieved_chunks)

        # 3. Build Grounded Prompt
        sys_prompt, user_prompt, indexed_chunks = prompt_builder.build_prompt(
            query=query,
            retrieved_chunks=ordered_chunks,
            language=language
        )

        # 4. Invoke LLM
        try:
            if mock_llm_response is not None:
                raw_llm_ans = mock_llm_response
            else:
                llm = self._get_llm()
                raw_llm_ans = llm.generate(prompt=user_prompt, system_prompt=sys_prompt, temperature=0.2)
        except Exception as e:
            logger.error(f"LLM generation failed: {e}. Falling back to extractive template.")
            extractive = answer_templater.generate_answer(query, intent, language, retrieved_chunks)
            return RAGResponse(
                answer=extractive["answer"],
                language=language,
                citations=[
                    CitationItem(
                        citation_id=1,
                        doc_name=c.get("doc_name", "doc"),
                        page=c.get("page", 1),
                        snippet=c.get("text", "")[:150],
                        score=c.get("score", 0.0)
                    ) for c in retrieved_chunks[:2]
                ],
                grounded=True,
                mode="extractive",
                hallucination_score=0.0,
                verification_details={"fallback_reason": str(e)}
            )

        # 5. Check if LLM signaled NO_ANSWER
        if "NO_ANSWER" in raw_llm_ans.strip():
            return RAGResponse(
                answer=self.IDK_MESSAGES.get(lang_key, self.IDK_MESSAGES["en"]),
                language=language,
                citations=[],
                grounded=True,
                mode="idk",
                hallucination_score=0.0,
                verification_details={"llm_status": "NO_ANSWER"}
            )

        # 6. Post-generation Groundedness & Citation Verification
        verif = hallucination_guard.verify(raw_llm_ans, indexed_chunks)

        # Build CitationItem objects
        citations = []
        for vc in verif["valid_citations"]:
            citations.append(CitationItem(
                citation_id=vc["citation_id"],
                doc_name=vc["doc_name"],
                page=vc["page"],
                snippet=vc["snippet"],
                score=vc["score"],
                upload_date=vc.get("upload_date")
            ))

        # 7. Verification Failure Check: Fall back to extractive if hallucination detected
        if not verif["grounded"] and verif["hallucination_score"] > 0.5:
            extractive = answer_templater.generate_answer(query, intent, language, retrieved_chunks)
            return RAGResponse(
                answer=extractive["answer"],
                language=language,
                citations=citations,
                grounded=False,
                mode="extractive",
                hallucination_score=verif["hallucination_score"],
                verification_details=verif
            )

        return RAGResponse(
            answer=raw_llm_ans,
            language=language,
            citations=citations,
            grounded=verif["grounded"],
            mode="rag",
            hallucination_score=verif["hallucination_score"],
            verification_details=verif
        )

rag_engine = RAGEngine()

