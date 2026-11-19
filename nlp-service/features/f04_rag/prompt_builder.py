from typing import List, Dict, Any, Tuple

class GroundedPromptBuilder:
    """
    Constructs grounded system prompts and indexed context blocks for RAG.
    Enforces strict rules:
    - Answer ONLY from the provided context.
    - Reply in the user's detected language.
    - Cite sources explicitly as [1], [2], etc.
    - If context is insufficient, output exactly 'NO_ANSWER'.
    """

    SYSTEM_INSTRUCTIONS = (
        "You are the official CampusMate Multilingual College Assistant. Your highest priority is factual precision.\n"
        "Strict Guidelines:\n"
        "1. Answer ONLY using the facts stated in the numbered Context Chunks below.\n"
        "2. Do NOT extrapolate, hallucinate, or assume details not present in the chunks.\n"
        "3. Reply in the exact same language as the user query (English, Hindi, Gujarati, or Hinglish).\n"
        "4. Cite your evidence inline using brackets matching the chunk numbers, e.g. [1], [2].\n"
        "5. If the provided context does NOT contain enough information to answer the question, output EXACTLY: NO_ANSWER.\n"
    )

    def build_prompt(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        language: str = "en"
    ) -> Tuple[str, str, List[Dict[str, Any]]]:
        """
        Builds the system prompt, user prompt with numbered chunks,
        and returns the indexed chunk list.
        """
        indexed_chunks = []
        context_blocks = []

        for idx, chunk in enumerate(retrieved_chunks, 1):
            doc_name = chunk.get("doc_name", "campus_doc.txt")
            page = chunk.get("page", 1)
            score = chunk.get("score", 0.0)
            upload_date = chunk.get("upload_date", "2024-06-01")
            text = chunk.get("text", "").strip()

            indexed_chunks.append({
                "citation_id": idx,
                "doc_name": doc_name,
                "page": page,
                "score": score,
                "upload_date": upload_date,
                "snippet": text[:200] + "..." if len(text) > 200 else text,
                "full_text": text
            })

            context_blocks.append(
                f"[{idx}] Source: {doc_name} (Page {page}, Date: {upload_date})\n{text}"
            )

        context_str = "\n\n".join(context_blocks)

        lang_note = f"Detected User Language: {language}"
        user_prompt = (
            f"=== Context Chunks ===\n{context_str}\n\n"
            f"=== User Inquiry ===\n"
            f"Language: {lang_note}\n"
            f"Question: {query}\n\n"
            f"Provide a concise, direct answer citing evidence as [1], [2]. If the context cannot answer this, output NO_ANSWER."
        )

        return self.SYSTEM_INSTRUCTIONS, user_prompt, indexed_chunks

prompt_builder = GroundedPromptBuilder()

