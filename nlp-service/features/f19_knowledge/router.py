from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os

from features.f19_knowledge.extractors import KnowledgeExtractor
from features.f19_knowledge.index import facts_index
from features.f19_knowledge.answering import knowledge_answer_engine

router = APIRouter(prefix="/v1/knowledge", tags=["knowledge"])
extractor = KnowledgeExtractor()

class IndexFactsRequest(BaseModel):
    facts: List[Dict[str, Any]]

class AnswerQueryRequest(BaseModel):
    query: str

@router.post("/index")
def index_facts(req: IndexFactsRequest):
    facts_index.build_index(req.facts)
    return {
        "status": "ok",
        "indexed_count": len(facts_index.facts)
    }

@router.get("/status")
def knowledge_status():
    return {
        "status": "ready" if facts_index.facts else "empty",
        "fact_count": len(facts_index.facts)
    }

@router.post("/answer")
def answer_knowledge(req: AnswerQueryRequest):
    return knowledge_answer_engine.answer_query(req.query)

class ExtractRequest(BaseModel):
    doc_id: str
    doc_name: str
    chunks: List[Dict[str, Any]]
    tables_per_page: Optional[Dict[int, List[List[List[str]]]]] = None

class FactItem(BaseModel):
    doc_id: str
    doc_name: str
    page: int
    type: str
    topic_key: str
    title: str
    answer: str
    question_variants: List[str] = []
    values: Dict[str, Any] = {}
    tags: Dict[str, Any] = {}
    source_quote: str
    confidence: float
    extracted_by: str
    status: str
    rejection_reason: Optional[str] = None

class ExtractResponse(BaseModel):
    total_facts: int
    approved_count: int
    needs_review_count: int
    rejected_count: int
    facts: List[Dict[str, Any]]

@router.post("/extract", response_model=ExtractResponse)
def extract_facts(req: ExtractRequest):
    facts = extractor.extract_document_facts(
        doc_id=req.doc_id,
        doc_name=req.doc_name,
        chunks=req.chunks,
        tables_per_page=req.tables_per_page
    )
    approved = [f for f in facts if f["status"] == "approved"]
    needs_review = [f for f in facts if f["status"] == "needs_review"]
    rejected = [f for f in facts if f["status"] == "rejected"]
    
    return {
        "total_facts": len(facts),
        "approved_count": len(approved),
        "needs_review_count": len(needs_review),
        "rejected_count": len(rejected),
        "facts": facts
    }
