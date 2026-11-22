import json
import re
import requests
from typing import List, Dict, Any, Tuple
from app.core.config import settings
from app.core.logging import logger

SYSTEM_RAG_PROMPT = """You are CampusMate AI, the official multilingual institutional assistant for Pandit Deendayal Energy University (PDEU).
Your mission is to provide accurate, grounded answers to students strictly based on the provided document excerpts.

CRITICAL RULES:
1. Answer ONLY using facts directly supported by the context below. Do not assume or extrapolate.
2. If the context does not contain sufficient information to answer the question, state:
   "I couldn't find this information in the available college documents. Please reach out to the campus helpdesk for assistance."
3. Every factual claim must be accompanied by a bracketed citation index [1], [2], etc., corresponding to the context passages.
4. Respond in the language and script requested by the student (e.g. English, Hindi, Gujarati, or natural conversational Hinglish).
5. Never invent contact details, course codes, exam dates, or fee amounts.
"""

class RAGEngine:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"

    def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[Tuple[Dict[str, Any], float]],
        detected_language: str
    ) -> Dict[str, Any]:
        """
        Generate grounded answer via LLM (Gemini) or extractive fallback.
        """
        if not retrieved_chunks:
            return self._idk_response(detected_language)

        # Build context and citations
        context_lines = []
        citations = []
        for i, (chunk, score) in enumerate(retrieved_chunks):
            citation_id = i + 1
            filename = chunk.get("filename", "Notice.pdf")
            page = chunk.get("page_number", 1)
            content = chunk.get("content", "")
            context_lines.append(f"[{citation_id}] Document: {filename} (Page {page}):\n{content}")
            citations.append({
                "citation_id": citation_id,
                "doc_name": filename,
                "page": page,
                "snippet": content[:180] + "...",
                "score": round(score, 4)
            })

        context_str = "\n\n".join(context_lines)

        # Attempt Gemini LLM Generation
        if self.api_key:
            try:
                answer = self._call_gemini(query, context_str, detected_language)
                if answer:
                    return {
                        "answer": answer,
                        "source_doc": citations[0]["doc_name"] if citations else None,
                        "citations": citations,
                        "mode": "rag",
                        "grounded": True
                    }
            except Exception as e:
                logger.warning(f"LLM Generation failed: {e}. Falling back to extractive.")

        # Grounded Extractive Fallback
        return self._extractive_fallback(query, retrieved_chunks, citations, detected_language)

    def _call_gemini(self, query: str, context: str, language: str) -> str:
        prompt = f"""{SYSTEM_RAG_PROMPT}

Student Question: {query}
Language requirement: {language}

Document Context:
{context}

Provide a concise, factual answer citing sources using [1], [2] brackets:"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 600
            }
        }
        res = requests.post(f"{self.endpoint}?key={self.api_key}", json=payload, timeout=8)
        if res.status_code == 200:
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        else:
            raise RuntimeError(f"Gemini HTTP {res.status_code}: {res.text}")

    def _extractive_fallback(
        self,
        query: str,
        retrieved_chunks: List[Tuple[Dict[str, Any], float]],
        citations: List[Dict[str, Any]],
        language: str
    ) -> Dict[str, Any]:
        """Extract the most relevant factual sentence from matching chunks."""
        query_words = set(re.findall(r'\w+', query.lower()))
        best_sentence = ""
        max_overlap = -1

        for chunk, _ in retrieved_chunks:
            content = chunk.get("content", "")
            lines = [l.strip() for l in content.split("\n") if len(l.strip()) > 10]
            if not lines:
                lines = [s.strip() for s in re.split(r'[.!?]', content) if len(s.strip()) > 10]

            for line in lines:
                overlap = len(set(re.findall(r'\w+', line.lower())) & query_words)
                if overlap > max_overlap:
                    max_overlap = overlap
                    best_sentence = line

        if not best_sentence and retrieved_chunks:
            best_sentence = retrieved_chunks[0][0].get("content", "")[:250]

        answer = f"{best_sentence} [1]"

        return {
            "answer": answer,
            "source_doc": citations[0]["doc_name"] if citations else None,
            "citations": citations[:2],
            "mode": "extractive",
            "grounded": True
        }

    def _idk_response(self, language: str) -> Dict[str, Any]:
        """Multilingual I-Don't-Know fallback."""
        if language in ["hi", "hinglish"]:
            msg = "माफ़ कीजिये, उपलब्ध कॉलेज दस्तावेज़ों में इसके बारे में पर्याप्त जानकारी नहीं मिली। कृपया सहायता के लिए कैंपस हेल्पडेस्क से संपर्क करें।"
        elif language in ["gu", "gujlish"]:
            msg = "માફ કરશો, ઉપલબ્ધ કૉલેજ દસ્તાવેજોમાં આ અંગે પૂરતી માહિતી મળી નથી. કૃપા કરીને મદદ માટે કૅમ્પસ હેલ્પડેસ્કનો સંપર્ક કરો."
        else:
            msg = "I couldn't find this information in the available college documents. Please reach out to the campus helpdesk for assistance."

        return {
            "answer": msg,
            "source_doc": None,
            "citations": [],
            "mode": "idk",
            "grounded": False
        }

rag_engine = RAGEngine()
