from app.services.ai_providers import OpenAICompatibleProvider, PlaceholderProvider
from app.services.ai_summary import _get_provider


def test_placeholder_provider():
    provider = PlaceholderProvider()
    assert provider.available() is True
    result = provider.summarize(
        canonical_title="Test Title",
        short_title=None,
        article_titles=["Article 1"],
        article_summaries=["Summary 1"],
    )
    assert result is not None
    assert "placeholder" in result.summary.lower()


def test_openai_provider_not_available_without_key(monkeypatch):
    monkeypatch.setattr("app.services.ai_providers.openai_compatible.settings.ai_api_key", None)
    provider = OpenAICompatibleProvider()
    assert provider.available() is False


def test_openai_provider_available_with_key(monkeypatch):
    monkeypatch.setattr("app.services.ai_providers.openai_compatible.settings.ai_api_key", "sk-test")
    monkeypatch.setattr("app.services.ai_providers.openai_compatible.settings.ai_enabled", True)
    provider = OpenAICompatibleProvider()
    assert provider.available() is True


def test_get_provider_returns_none_when_disabled(monkeypatch):
    monkeypatch.setattr("app.services.ai_summary.settings.ai_enabled", False)
    assert _get_provider() is None


def test_get_provider_returns_openai_when_enabled_and_key_set(monkeypatch):
    monkeypatch.setattr("app.services.ai_summary.settings.ai_enabled", True)
    monkeypatch.setattr("app.services.ai_summary.settings.ai_provider", "openai")
    monkeypatch.setattr("app.services.ai_summary.settings.ai_api_key", "sk-test")
    provider = _get_provider()
    assert isinstance(provider, OpenAICompatibleProvider)


def test_get_provider_returns_placeholder_when_enabled_but_no_key(monkeypatch):
    monkeypatch.setattr("app.services.ai_summary.settings.ai_enabled", True)
    monkeypatch.setattr("app.services.ai_summary.settings.ai_provider", "openai")
    monkeypatch.setattr("app.services.ai_summary.settings.ai_api_key", None)
    provider = _get_provider()
    assert isinstance(provider, PlaceholderProvider)
