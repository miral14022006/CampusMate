from typing import List, Dict, Any, Tuple, Optional

class GroundedPromptBuilder:
    """
    Constructs grounded system prompts and indexed context blocks for RAG.
    Enforces strict rules:
    - Official campus inquiries grounded in provided context chunks.
    - Multilingual translation & answering: answers in Gujarati / Hindi / Hinglish / Gujlish even when docs are in English.
    - General academic/computer science concepts explained directly using general AI knowledge.
    - Conversational exam inquiries provide exam cycle overview and clarify branch/semester.
    - Conversation history included for multi-turn contextual continuity.
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
        "3. CRITICAL MULTILINGUAL RULES:\n"
        "   - You MUST respond in the EXACT language and script of the user's inquiry:\n"
        "     * Gujarati script (e.g. 'રંગતાલ ક્યારે છે?'): Answer in natural, fluent Gujarati script.\n"
        "     * Gujlish / Romanized Gujarati (e.g. 'rangtaal kyare che?', 'exam form bharvani last date su che?'): Answer in natural Gujarati (in Gujarati script or clear conversational Gujlish).\n"
        "     * Hindi (Devanagari) (e.g. 'रंगताल कब होता है?', 'परीक्षा कब है?'): Answer in natural, fluent Hindi.\n"
        "     * Hinglish / Romanized Hindi (e.g. 'exam kab hai?', 'fees kitni hai?'): Answer in conversational Hinglish or clean Hindi.\n"
        "     * English: Answer in clear English.\n"
        "   - CROSS-LINGUAL EXTRACTION: Official university documents are usually written in English. When the user asks in Gujarati or Hindi, you MUST extract the factual information from the English context chunks and formulate your answer in the user's question language! NEVER say information is not available just because the documents are written in English!\n"
        "   - Technical terms (e.g., 'Computer Engineering', 'Mid-Semester Exam', 'Hall Ticket') may be kept in English or transliterated naturally.\n"
        "   - Maintain a friendly, supportive, and polite conversational tone.\n"
    )

    def build_prompt(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        language: str = "en",
        conversation_history: Optional[List[Dict[str, str]]] = None
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

        context_str = "\n\n".join(context_blocks) if context_blocks else "No relevant document chunks found."

        # Map language tag to human instructions
        lang_instructions = {
            "gu": "Gujarati (ગુજરાતી script). Answer completely in natural Gujarati, even though context is in English.",
            "gu-Latn": "Gujarati / Gujlish. Answer in natural Gujarati or conversational Gujlish based on the English context.",
            "gujlish": "Gujarati / Gujlish. Answer in natural Gujarati or conversational Gujlish based on the English context.",
            "hi": "Hindi (हिंदी Devanagari script). Answer completely in natural Hindi, even though context is in English.",
            "hi-Latn": "Hinglish / Hindi. Answer in conversational Hinglish or Hindi based on the English context.",
            "en": "English."
        }
        target_lang_desc = lang_instructions.get(language, f"{language}. Match the user's language.")

        # Build conversation history block if available
        history_str = ""
        if conversation_history:
            recent_turns = conversation_history[-6:]
            hist_lines = []
            for turn in recent_turns:
                role = "User" if turn.get("role") == "user" else "Assistant"
                content = (turn.get("content") or "").strip()
                if content:
                    hist_lines.append(f"{role}: {content}")
            if hist_lines:
                history_str = "=== Conversation History ===\n" + "\n".join(hist_lines) + "\n\n"

        user_prompt = (
            f"=== Context Chunks ===\n{context_str}\n\n"
            f"{history_str}"
            f"=== User Inquiry ===\n"
            f"Detected Language: {language} ({target_lang_desc})\n"
            f"Question: {query}\n\n"
            f"CRITICAL REMINDERS:\n"
            f"1. Respond in {target_lang_desc}.\n"
            f"2. If the user question can be answered using the Context Chunks above, extract the answer and cite the source, citing evidence as [1], [2].\n"
            f"3. If the question is a general topic, greeting, or coding question, answer helpfully like ChatGPT/Gemini in {target_lang_desc}.\n"
            f"4. Do NOT say NO_ANSWER if the facts exist in the context chunks."
        )

        return self.SYSTEM_INSTRUCTIONS, user_prompt, indexed_chunks

prompt_builder = GroundedPromptBuilder()
