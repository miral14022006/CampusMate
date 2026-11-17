from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class CitationItem(BaseModel):
    citation_id: int
    doc_name: str
    page: int
    snippet: str
    score: float
    upload_date: Optional[str] = "2024-01-01"

class RAGResponse(BaseModel):
    answer: str
    language: str
    citations: List[CitationItem] = Field(default_factory=list)
    grounded: bool = True
    mode: str = "rag" # "rag" | "extractive" | "idk"
    hallucination_score: float = 0.0
    verification_details: Dict[str, Any] = Field(default_factory=dict)

