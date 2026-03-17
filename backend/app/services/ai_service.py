"""
Unified AI provider interface.
Supports: OpenAI, Anthropic, Google Gemini, Ollama (local), HuggingFace.
API keys are decrypted at request time — never cached in memory.
"""
import json
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.utils.security import decrypt_api_key

COURSE_OUTLINE_PROMPT = """\
You are an expert course designer. Generate a structured course outline in JSON.

Topic: {topic}

Return ONLY valid JSON in this exact structure:
{{
  "title": "Course title",
  "description": "Short course description",
  "modules": [
    {{
      "title": "Module title",
      "description": "Module description",
      "topics": ["topic 1", "topic 2", "topic 3"]
    }}
  ]
}}

Generate {num_modules} modules. Be specific and educational.
"""

SUMMARISE_PROMPT = """\
Summarise the following content. Mode: {mode}

Content:
{content}

Instructions:
- If mode is "summary": Return a concise prose summary (3-5 paragraphs).
- If mode is "key_points": Return 5-10 bullet points of the key ideas as plain text, one per line starting with "• ".
- If mode is "flashcards": Return ONLY valid JSON: {{"cards": [{{"front": "Question or term?", "back": "Answer or definition"}}]}}
"""

TEACH_BACK_QUESTIONS_PROMPT = """\
Based on the following content, generate 5 thought-provoking open-ended questions that test deep understanding.

Content:
{content}

Return ONLY valid JSON:
{{
  "questions": [
    "Question 1?",
    "Question 2?",
    "Question 3?",
    "Question 4?",
    "Question 5?"
  ]
}}
"""

TEACH_BACK_GRADE_PROMPT = """\
You are a tutor evaluating a student's answer to a question.

Question: {question}
Student's answer: {user_answer}

Score the answer on a scale of 1-5 (1=completely wrong, 3=partially correct, 5=excellent) and provide constructive feedback.

Return ONLY valid JSON:
{{
  "score": 3,
  "feedback": "Detailed feedback here...",
  "model_answer": "What a complete answer would look like..."
}}
"""

QUIZ_PROMPT = """\
Based on the following content, generate {num_questions} multiple-choice quiz questions in JSON.

Content:
{content}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "question": "Question text?",
      "options": ["A) option", "B) option", "C) option", "D) option"],
      "correct": 0,
      "explanation": "Why this answer is correct"
    }}
  ]
}}
"""


class BaseAIAdapter(ABC):
    @abstractmethod
    async def complete(self, prompt: str) -> str:
        """Return model completion as a string."""


class OpenAIAdapter(BaseAIAdapter):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self._api_key = api_key
        self._model = model

    async def complete(self, prompt: str) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self._api_key)
        response = await client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content or ""


class AnthropicAdapter(BaseAIAdapter):
    def __init__(self, api_key: str, model: str = "claude-haiku-4-5-20251001"):
        self._api_key = api_key
        self._model = model

    async def complete(self, prompt: str) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=self._api_key)
        message = await client.messages.create(
            model=self._model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text if message.content else ""


class GeminiAdapter(BaseAIAdapter):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self._api_key = api_key
        self._model = model

    async def complete(self, prompt: str) -> str:
        import google.generativeai as genai
        genai.configure(api_key=self._api_key)
        model = genai.GenerativeModel(self._model)
        # google-generativeai doesn't have async yet — wrap in thread
        import asyncio
        response = await asyncio.to_thread(model.generate_content, prompt)
        return response.text or ""


class OllamaAdapter(BaseAIAdapter):
    """Uses Ollama's OpenAI-compatible API at localhost:11434."""

    def __init__(self, model: str = "llama3.2", base_url: str = "http://localhost:11434"):
        self._model = model
        self._base_url = base_url.rstrip("/")

    async def complete(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self._base_url}/api/generate",
                json={"model": self._model, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            return resp.json().get("response", "")


class HuggingFaceAdapter(BaseAIAdapter):
    def __init__(self, api_key: str, model: str = "mistralai/Mistral-7B-Instruct-v0.3"):
        self._api_key = api_key
        self._model = model

    async def complete(self, prompt: str) -> str:
        from huggingface_hub import AsyncInferenceClient
        client = AsyncInferenceClient(token=self._api_key)
        result = await client.text_generation(
            prompt, model=self._model, max_new_tokens=2048
        )
        return result


def _make_adapter(config: dict[str, Any]) -> BaseAIAdapter:
    """Build the appropriate adapter from a provider config dict."""
    provider = config["provider_name"]
    raw_key = config.get("api_key_encrypted")
    api_key = decrypt_api_key(raw_key) if raw_key else ""
    model = config.get("model_name", "")
    base_url = config.get("base_url") or ""

    if provider == "openai":
        return OpenAIAdapter(api_key=api_key, model=model or "gpt-4o-mini")
    if provider == "anthropic":
        return AnthropicAdapter(api_key=api_key, model=model or "claude-haiku-4-5-20251001")
    if provider == "gemini":
        return GeminiAdapter(api_key=api_key, model=model or "gemini-1.5-flash")
    if provider == "ollama":
        return OllamaAdapter(model=model or "llama3.2", base_url=base_url or "http://localhost:11434")
    if provider == "huggingface":
        return HuggingFaceAdapter(api_key=api_key, model=model or "mistralai/Mistral-7B-Instruct-v0.3")
    raise ValueError(f"Unknown provider: {provider!r}")


def _parse_json(text: str) -> dict:
    """Extract JSON from model output (model may wrap in markdown code fences)."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        inner = "\n".join(
            line for line in lines
            if not line.startswith("```")
        )
        text = inner.strip()
    return json.loads(text)


class AIService:
    """Stateless service — constructs adapters per-request from DB config."""

    async def generate_course_outline(
        self, config: dict[str, Any], topic: str, num_modules: int = 5
    ) -> dict:
        adapter = _make_adapter(config)
        prompt = COURSE_OUTLINE_PROMPT.format(topic=topic, num_modules=num_modules)
        raw = await adapter.complete(prompt)
        return _parse_json(raw)

    async def generate_quiz(
        self, config: dict[str, Any], content_text: str, num_questions: int = 5
    ) -> dict:
        adapter = _make_adapter(config)
        prompt = QUIZ_PROMPT.format(content=content_text[:4000], num_questions=num_questions)
        raw = await adapter.complete(prompt)
        return _parse_json(raw)

    async def summarise(
        self, config: dict[str, Any], content_text: str, mode: str = "summary"
    ) -> dict:
        adapter = _make_adapter(config)
        prompt = SUMMARISE_PROMPT.format(content=content_text[:6000], mode=mode)
        raw = await adapter.complete(prompt)
        if mode == "flashcards":
            try:
                return _parse_json(raw)
            except Exception:
                return {"mode": mode, "result": raw.strip()}
        return {"mode": mode, "result": raw.strip()}

    async def generate_teach_back_questions(
        self, config: dict[str, Any], content_text: str
    ) -> dict:
        adapter = _make_adapter(config)
        prompt = TEACH_BACK_QUESTIONS_PROMPT.format(content=content_text[:6000])
        raw = await adapter.complete(prompt)
        return _parse_json(raw)

    async def grade_teach_back(
        self, config: dict[str, Any], question: str, user_answer: str
    ) -> dict:
        adapter = _make_adapter(config)
        prompt = TEACH_BACK_GRADE_PROMPT.format(question=question, user_answer=user_answer)
        raw = await adapter.complete(prompt)
        return _parse_json(raw)


ai_service = AIService()
