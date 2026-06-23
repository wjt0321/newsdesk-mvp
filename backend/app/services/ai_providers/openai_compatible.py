import json
import os
from typing import Optional

import httpx

from ...config import settings
from .base import AIProvider, SummaryResult


DEFAULT_TIMEOUT = 60.0


class OpenAICompatibleProvider(AIProvider):
    """Provider for any OpenAI-compatible API: DeepSeek, OpenAI, Doubao, etc.

    Required configuration (via env or .env):
    - ai_api_key
    - ai_model (e.g. deepseek-chat, gpt-4o-mini, doubao-lite)
    Optional:
    - ai_base_url (defaults to OpenAI if not set)
    - ai_temperature (default 0.7)
    - ai_max_tokens (default 512)
    """

    def __init__(self) -> None:
        self.api_key = settings.ai_api_key or os.getenv("AI_API_KEY")
        self.model = settings.ai_model or os.getenv("AI_MODEL", "gpt-4o-mini")
        self.base_url = settings.ai_base_url or os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
        self.temperature = float(os.getenv("AI_TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("AI_MAX_TOKENS", "512"))

    def available(self) -> bool:
        return bool(self.api_key) and settings.ai_enabled

    def _build_prompt(
        self,
        canonical_title: str,
        short_title: Optional[str],
        article_titles: list[str],
        article_summaries: list[str],
    ) -> str:
        lines = [
            "You are a news briefing assistant. Summarize the following news story.",
            "",
            "Output strictly as JSON with keys: summary (string), key_points (list of strings), differences (list of strings).",
            "",
            f"Story title: {canonical_title}",
        ]
        if short_title and short_title != canonical_title:
            lines.append(f"Short title: {short_title}")
        lines.append("")
        lines.append("Articles:")
        for idx, (title, summary) in enumerate(zip(article_titles, article_summaries), 1):
            lines.append(f"{idx}. {title}")
            if summary:
                lines.append(f"   {summary}")
        return "\n".join(lines)

    def summarize(
        self,
        canonical_title: str,
        short_title: Optional[str],
        article_titles: list[str],
        article_summaries: list[str],
    ) -> Optional[SummaryResult]:
        if not self.available():
            return None

        prompt = self._build_prompt(
            canonical_title, short_title, article_titles, article_summaries
        )

        try:
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You output only valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens,
                },
                timeout=DEFAULT_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            usage = data.get("usage", {})
            token_cost = usage.get("total_tokens", 0)

            return SummaryResult(
                summary=parsed.get("summary", ""),
                key_points=parsed.get("key_points", []),
                differences=parsed.get("differences", []),
                model=self.model,
                token_cost=token_cost,
            )
        except Exception:
            # Fail silently: the caller decides whether to fall back.
            return None
