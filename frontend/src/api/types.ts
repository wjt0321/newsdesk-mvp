export interface Source {
  id: number;
  name: string;
  type: string;
  url: string;
  category: string;
  language: string;
  region: string;
  trust_level: number;
  fetch_interval_minutes: number;
  enabled: boolean;
  error_count: number;
  last_fetched_at: string | null;
  last_success_at: string | null;
  created_at: string;
}

export interface SourceCreate {
  name: string;
  type?: string;
  url: string;
  category?: string;
  language?: string;
  region?: string;
  trust_level?: number;
  fetch_interval_minutes?: number;
  enabled?: boolean;
}

export interface SourceUpdate {
  name?: string;
  type?: string;
  url?: string;
  category?: string;
  language?: string;
  region?: string;
  trust_level?: number;
  fetch_interval_minutes?: number;
  enabled?: boolean;
}

export interface SourceHealth {
  id: number;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  status: "healthy" | "degraded" | "broken" | "silent" | "noisy" | "disabled";
  last_fetched_at: string | null;
  last_success_at: string | null;
  error_count: number;
  article_count_24h: number;
  story_count_24h: number;
  duplicate_count_24h: number;
  consecutive_failures: number;
  latest_error: string | null;
  suggested_action: string;
}

export interface Article {
  id: number;
  source_id: number;
  title: string;
  url: string;
  canonical_url: string | null;
  author: string | null;
  published_at: string | null;
  summary_raw: string | null;
  content_text: string | null;
  image_url: string | null;
  language: string | null;
  hash_content: string | null;
  fetched_at: string;
  hash_url: string;
  hash_title: string;
  status: string;
  source_name?: string | null;
  clean_title?: string | null;
  clean_summary?: string | null;
  clean_content_text?: string | null;
}

export interface FetchLog {
  id: number;
  source_id: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  fetched_count: number;
  new_count: number;
  error_message: string | null;
}

export interface Story {
  id: number;
  canonical_title: string;
  short_title: string | null;
  clean_title?: string | null;
  clean_summary?: string | null;
  first_seen_at: string;
  last_updated_at: string;
  source_count: number;
  article_count: number;
  heat_score: number;
  confidence: number;
  merge_reason: string | null;
  needs_review: boolean;
  status: string;
  article_ids: number[];
  source_names: string[];
  source_ids: number[];
  articles: Article[];
}

export interface WatchRule {
  id: number;
  name: string;
  keywords: string;
  enabled: boolean;
  created_at: string;
}

export interface WatchRuleCreate {
  name: string;
  keywords: string;
  enabled?: boolean;
}

export interface WatchRuleUpdate {
  name?: string;
  keywords?: string;
  enabled?: boolean;
}

export interface Channel {
  id: string;
  name: string;
}
