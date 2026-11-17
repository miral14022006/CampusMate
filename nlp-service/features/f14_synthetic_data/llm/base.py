from abc import ABC, abstractmethod
from typing import List, Optional

class BaseLLMProvider(ABC):
    """Abstract Base Class for LLM providers."""

    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.8) -> str:
        """Generates completion for a given prompt."""
        pass

