export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  const diffMs = now.getTime() - date.getTime();
  const isFuture = diffMs < 0;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  if (diffSeconds < 60) {
    return isFuture ? "片刻后" : "刚刚";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return isFuture ? `${diffMinutes}分钟后` : `${diffMinutes}分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return isFuture ? `${diffHours}小时后` : `${diffHours}小时前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return isFuture ? `${diffDays}天后` : `${diffDays}天前`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return isFuture ? `${diffMonths}个月后` : `${diffMonths}个月前`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return isFuture ? `${diffYears}年后` : `${diffYears}年前`;
}

export function formatStoryStatus(status: string): string {
  switch (status) {
    case "breaking":
      return "突发";
    case "hot":
      return "热门";
    case "new":
      return "最新";
    case "developing":
      return "进展中";
    case "stable":
      return "稳定";
    default:
      return status;
  }
}

import type { Story, Article } from "../api/types";

export function displayStoryTitle(story: Story): string {
  return story.clean_title || story.short_title || story.canonical_title;
}

export function displayStorySubtitle(story: Story): string | null {
  const subtitle = story.short_title || story.canonical_title;
  const title = displayStoryTitle(story);
  if (subtitle && subtitle !== title) {
    return subtitle;
  }
  return null;
}

export function displayArticleTitle(article: Article): string {
  return article.clean_title || article.title;
}

export function displayArticleSummary(article: Article): string | null {
  return article.clean_summary || article.summary_raw || article.content_text?.slice(0, 240) || null;
}

export function storySources(story: Story): { id: number; name: string }[] {
  const map = new Map<number, string>();
  for (const article of story.articles || []) {
    if (article.source_id && !map.has(article.source_id)) {
      map.set(article.source_id, article.source_name || `来源 #${article.source_id}`);
    }
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

export function storyHasImage(story: Story): boolean {
  return story.articles?.some((article) => article.image_url) ?? false;
}
