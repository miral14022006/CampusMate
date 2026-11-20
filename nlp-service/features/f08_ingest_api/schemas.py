from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class IngestRequest(BaseModel):
    file_path: str
    title: str
    topic_key: str
    doc_type: str = "notice"
    version: int = 1
    effective_date: Optional[str] = None
    department: str = "Examination Cell"
    language: str = "en"
    replace_topic: bool = False

class IngestResponse(BaseModel):
    status: str
    chunks_created: int
    total_chunks: int
    new_index_version: str
    calendar_candidates: Optional[List[Dict[str, Any]]] = None
    pages: Optional[int] = None
    text_length: Optional[int] = None
    text_preview: Optional[str] = None
    extraction_warning: Optional[str] = None

class ReindexResponse(BaseModel):
    status: str
    message: str
    new_index_version: str
    active_chunks: int

