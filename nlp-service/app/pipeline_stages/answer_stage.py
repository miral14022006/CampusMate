import json
from app.pipeline_stages.base import PipelineStage, PipelineContext
from app.core.config import FEATURES_CONFIG_PATH
from app.modules.answer_template import answer_templater
from features.f04_rag.engine import rag_engine

class AnswerStage(PipelineStage):
    """
    Stage responsible for generating final response.
    When 'rag_generation' feature flag is true, invokes RAGEngine (grounded prompt,
    LLM generation, citation parser, hallucination guard).
    Otherwise falls back to template extractive generation.
    """
    @property
    def name(self) -> str:
        return "answer_generation"

    def _is_rag_enabled(self) -> bool:
        if FEATURES_CONFIG_PATH.exists():
            try:
                with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                    flags = json.load(f)
                    return flags.get("rag_generation", True)
            except Exception:
                pass
        return True

    def run(self, context: PipelineContext) -> PipelineContext:
        # If Decision is CLARIFY or FALLBACK, surface clarification question as the primary answer
        if context.decision in ["CLARIFY", "FALLBACK"] and context.clarification_question:
            context.answer = context.clarification_question
            context.generation_mode = "idk" if context.decision == "FALLBACK" else "clarify"
            return context

        query_to_use = context.standalone_query or context.raw_query

        if self._is_rag_enabled():
            rag_res = rag_engine.generate_answer(
                query=query_to_use,
                retrieved_chunks=context.retrieved_chunks,
                language=context.language,
                intent=context.intent
            )
            context.answer = rag_res.answer
            context.citations = [c.dict() for c in rag_res.citations]
            context.grounded = rag_res.grounded
            context.generation_mode = rag_res.mode
            context.hallucination_score = rag_res.hallucination_score
            if rag_res.citations:
                context.source_doc = rag_res.citations[0].doc_name
            elif context.retrieved_chunks:
                context.source_doc = context.retrieved_chunks[0].get("doc_name")
            return context

        ans_info = answer_templater.generate_answer(
            query=query_to_use,
            intent=context.intent,
            language=context.language,
            retrieved_chunks=context.retrieved_chunks
        )
        context.answer = ans_info["answer"]
        context.source_doc = ans_info.get("source_doc")
        context.generation_mode = "extractive"
        return context
