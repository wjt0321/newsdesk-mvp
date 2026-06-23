from typing import Optional

from .base import AIProvider, SummaryResult


class PlaceholderProvider(AIProvider):
    """Fallback provider used when AI is disabled or no real provider is configured."""

    def __init__(self, model: str = "placeholder") -> None:
        self.model = model

    def available(self) -> bool:
        return True

    def summarize(
        self,
        canonical_title: str,
        short_title: Optional[str],
        article_titles: list[str],
        article_summaries: list[str],
    ) -> Optional[SummaryResult]:
        display_title = short_title or canonical_title
        return SummaryResult(
            summary=f"{display_title} (AI summary placeholder - configure an API key to enable real summaries)",
            key_points=["Placeholder key point 1", "Placeholder key point 2"],
            differences=["No differences detected in placeholder mode."],
            model=self.model,
            token_cost=0,
        )
