from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "sqlite:///./data/newsdesk.db"
    app_name: str = "NewsDesk MVP"

    # AI summary settings. AI is an optional enhancement; defaults keep it off.
    ai_enabled: bool = False
    ai_provider: str = "openai"  # openai, deepseek, doubao, placeholder
    ai_model: str = "gpt-4o-mini"
    ai_base_url: str | None = None  # e.g. https://api.deepseek.com/v1
    ai_api_key: str | None = None
    ai_daily_limit: int = 50


settings = Settings()
