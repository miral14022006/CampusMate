from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseIntentClassifier(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the classifier model."""
        pass

    @abstractmethod
    def predict(self, text: str) -> Dict[str, Any]:
        """
        Predicts intent for input text.
        Returns:
        {
            "intent": str,
            "confidence": float,
            "is_fallback": bool,
            "top3": List[Dict[str, Any]]  # [{"intent": str, "score": float}, ...]
        }
        """
        pass

