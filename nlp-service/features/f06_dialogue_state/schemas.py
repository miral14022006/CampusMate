from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class TurnRecord(BaseModel):
    user_query: str
    standalone_query: Optional[str] = None
    intent: str
    slots: Dict[str, Any] = Field(default_factory=dict)
    answer: str = ""

class DialogueState(BaseModel):
    session_id: str
    last_intent: Optional[str] = None
    slots: Dict[str, Any] = Field(default_factory=lambda: {
        "course": None,
        "branch": None,
        "semester": None,
        "exam_type": None,
        "date": None
    })
    last_retrieved_doc: Optional[str] = None
    turns: List[TurnRecord] = Field(default_factory=list)
    awaiting_slot: Optional[str] = None
    is_reset: bool = False

