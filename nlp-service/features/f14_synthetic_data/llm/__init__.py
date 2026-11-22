import os
from features.f14_synthetic_data.llm.base import BaseLLMProvider
from features.f14_synthetic_data.llm.gemini_provider import GeminiProvider
from features.f14_synthetic_data.llm.openai_provider import OpenAIProvider
from features.f14_synthetic_data.llm.anthropic_provider import AnthropicProvider
from features.f14_synthetic_data.llm.ollama_provider import OllamaProvider
from features.f14_synthetic_data.llm.groq_provider import GroqProvider

def get_llm_provider(provider_name: str = None) -> BaseLLMProvider:
    name = (provider_name or os.getenv("LLM_PROVIDER", "groq")).lower()
    if name in ["groq", "grok"]:
        return GroqProvider()
    elif name == "gemini":
        return GeminiProvider()
    elif name == "openai":
        return OpenAIProvider()
    elif name == "anthropic":
        return AnthropicProvider()
    elif name == "ollama":
        return OllamaProvider()
    else:
        raise ValueError(f"Unsupported LLM provider: {name}. Choose from groq, gemini, openai, anthropic, ollama.")
