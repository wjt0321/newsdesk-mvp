from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class SummaryResult:
    summary: str
    key_points: list[str]
    differences: list[str]
    model: str
    token_cost: int = 0


class AIProvider(ABC):
    """Abstract base for AI summary providers."""

    @abstractmethod
    def summarize(
        self,
        canonical_title: str,
        short_title: Optional[str],
        article_titles: list[str],
        article_summaries: list[str],
    ) -> Optional[SummaryResult]:
        """Return a SummaryResult or None if generation failed/skipped."""
        raise NotImplementedError

    @abstractmethod
    def available(self) -> bool:
        """Return True if the provider is configured and ready to call."""
        raise NotImplementedError
