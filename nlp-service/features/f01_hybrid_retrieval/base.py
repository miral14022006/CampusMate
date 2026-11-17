from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseRetriever(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the retrieval method."""
        pass

    @abstractmethod
    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        """
        Retrieves top_k chunks for the given query.
        Returns list of dicts:
        [{
            'chunk_id': str,
            'doc_name': str,
            'page': int,
            'score': float,
            'text': str
        }]
        """
        pass

