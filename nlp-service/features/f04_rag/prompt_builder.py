from typing import List, Dict, Any, Tuple

class GroundedPromptBuilder:
    """
    Constructs grounded system prompts and indexed context blocks for RAG.
    Enforces strict rules:
    - Official campus inquiries grounded in provided context chunks.
    - General academic/computer science concepts explained directly using general AI knowledge.
    - Conversational exam inquiries provide exam cycle overview and clarify branch/semester.
    - Reply in user's detected language.
    - Cite sources explicitly as [1], [2], etc.
    """

    SYSTEM_INSTRUCTIONS = (
        "You are CampusMate, an intelligent, helpful multilingual AI assistant for students at Pandit Deendayal Energy University (PDEU) — capable of general conversation like ChatGPT / Gemini as well as answering college-specific questions from official documents.\n\n"
        "Guidelines:\n"
        "1. College & Campus Inquiries (Circulars, Fees, Timetables, Holidays, Policies):\n"
        "   - When relevant Context Chunks are provided below, use them as your primary source of truth for all PDEU announcements, hostel fees, mess fees, exam dates, and notices.\n"
        "   - For specific branch and semester timetable requests, output a clean Markdown table with columns: Date | Time | Subject | Course Code [citation]. Include every subject for that branch and semester present in the context.\n"
        "   - For broad exam inquiries where branch or semester is not yet specified, provide an overview of the exam cycle and invite the student to specify branch/semester.\n"
        "   - Cite relevant context chunks inline immediately after factual claims using [1], [2], etc.\n"
        "   - Only output NO_ANSWER if the user specifically asks an official campus document question (e.g. asking for specific PDEU circular details or numbers) that is NOT present in the Context Chunks.\n\n"
        "2. General Knowledge, Conversational & Academic Chat (Like ChatGPT / Gemini):\n"
        "   - If the student asks a general question, greeting, general knowledge query, coding/technical explanation, advice, or conversational chat NOT asking for an official college circular (e.g., 'Hello', 'Who was the first person on the moon?', 'What is computer?', 'कंप्यूटर क्या है?', 'How does machine learning work?', 'Write a poem', 'Tell me a joke'):\n"
        "     * Answer helpfully, accurately, and naturally using your extensive AI knowledge.\n"
        "     * Format cleanly with Markdown (lists, bolding, code blocks when suitable).\n"
        "     * DO NOT output NO_ANSWER for general or conversational questions.\n\n"
        "3. Language & Multilingual Tone:\n"
        "   - Respond in the EXACT language of the user inquiry (English, Hindi, Gujarati, Hinglish, or Gujlish).\n"
        "   - If the user asks in Hindi (e.g. 'होस्टल की फीस कितनी है?'), answer fully in natural, fluent Hindi.\n"
        "   - If the user asks in Gujarati (e.g. 'હોસ્ટેલ ની ફી કેટલી છે?'), answer fully in natural, fluent Gujarati.\n"
        "   - If the user asks in English, answer in English.\n"
        "   - Maintain a friendly, supportive, and polite conversational tone.\n"
    )

    def build_prompt(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        language: str = "en"
    ) -> Tuple[str, str, List[Dict[str, Any]]]:
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
            f"Instructions:\n"
            f"- If the question is about university circulars, dates, fees, or policies and relevant Context Chunks are present, answer accurately using the chunks, citing evidence as [1], [2].\n"
            f"- If the question is a general knowledge question, greeting, conversational query, or general conceptual topic, answer naturally and conversationally like ChatGPT/Gemini in the user's language.\n"
            f"- Only output NO_ANSWER if the inquiry specifically demands official PDEU documents/circulars that are not provided in the context."
        )

        return self.SYSTEM_INSTRUCTIONS, user_prompt, indexed_chunks

prompt_builder = GroundedPromptBuilder()
