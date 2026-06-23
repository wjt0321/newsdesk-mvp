import { useQuery } from "@tanstack/react-query";
import type { Story } from "../api/types";
import { X, ExternalLink, Clock, Flame, Newspaper, Calendar, GitMerge, AlertTriangle, Diff } from "lucide-react";
import clsx from "clsx";
import { formatRelativeTime, formatStoryStatus } from "../lib/format";
import { listSources } from "../api/sources";
import { api } from "../api/client";

interface StoryDrawerProps {
  story: Story | null;
  onClose: () => void;
}

function useSourceNameLookup() {
  const { data: sources = [] } = useQuery({
    queryKey: ["sources"],
    queryFn: listSources,
  });
  return new Map(sources.map((s) => [s.id, s.name]));
}

interface StoryDiff {
  story_id: number;
  canonical_title: string;
  sources: string[];
  articles: {
    source_name: string;
    article_id: number;
    title: string;
    summary: string | null;
    published_at: string | null;
    url: string | null;
  }[];
  common_words: string[];
  unique_phrases: string[];
}

function useStoryDiff(storyId: number | undefined) {
  return useQuery<StoryDiff>({
    queryKey: ["story-diff", storyId],
    queryFn: async () => {
      const { data } = await api.get<StoryDiff>(`/stories/${storyId}/diff`);
      return data;
    },
    enabled: !!storyId,
  });
}

export function StoryDrawer({ story, onClose }: StoryDrawerProps) {
  const sourceNameById = useSourceNameLookup();
  const { data: diff } = useStoryDiff(story?.id);

  if (!story) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
        <div className="h-14 border-b border-border flex items-center justify-between px-5 flex-shrink-0">
          <h2 className="font-semibold truncate pr-4">报道详情</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-background transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6">
          <div>
            <span
              className={clsx(
                "inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3",
                story.status === "breaking"
                  ? "bg-red-100 text-red-700"
                  : story.status === "hot"
                  ? "bg-amber-100 text-amber-700"
                  : story.status === "new"
                  ? "bg-green-100 text-green-700"
                  : story.status === "developing"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-text-secondary"
              )}
            >
              {formatStoryStatus(story.status)}
            </span>
            <h3 className="text-xl font-semibold leading-snug">
              {story.canonical_title}
            </h3>
            {story.short_title && story.short_title !== story.canonical_title && (
              <p className="text-sm text-text-secondary mt-1">
                {story.short_title}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-background rounded-lg p-3">
              <div className="text-text-secondary text-xs flex items-center gap-1">
                <Newspaper className="w-3 h-3" />
                来源
              </div>
              <div className="font-semibold mt-0.5">{story.source_count}</div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <div className="text-text-secondary text-xs flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                文章
              </div>
              <div className="font-semibold mt-0.5">{story.article_count}</div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <div className="text-text-secondary text-xs flex items-center gap-1">
                <Flame className="w-3 h-3" />
                热度
              </div>
              <div className="font-semibold mt-0.5">
                {story.heat_score.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="bg-background rounded-lg p-3 text-sm space-y-2">
            <div className="flex items-center gap-2 text-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span>更新于 {formatRelativeTime(story.last_updated_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                首次出现{" "}
                {new Date(story.first_seen_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <GitMerge className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-text-secondary">
                合并依据{" "}
                <span className="font-medium text-text-primary">
                  {story.merge_reason ?? "未知"}
                </span>
                {story.confidence > 0 && (
                  <span className="ml-2">
                    · 置信度 {(story.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </span>
              {story.needs_review && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3" />
                  需审核
                </span>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">来源</h4>
            <div className="flex flex-wrap gap-2">
              {story.source_names.map((name) => (
                <span
                  key={name}
                  className="text-xs px-2 py-1 rounded-md bg-background border border-border"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">
              文章 ({story.articles.length})
            </h4>
            <ul className="space-y-2">
              {story.articles.map((article) => (
                <li
                  key={article.id}
                  className="group p-2 rounded-lg hover:bg-background transition-colors"
                >
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-accent hover:underline line-clamp-2">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                        <span className="font-medium">
                          {sourceNameById.get(article.source_id) || `来源 #${article.source_id}`}
                        </span>
                        {article.published_at && (
                          <span>{formatRelativeTime(article.published_at)}</span>
                        )}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {diff && diff.articles.length > 1 && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <Diff className="w-4 h-4" />
                来源差异
              </h4>
              {diff.common_words.length > 0 && (
                <div className="mb-3">
                  <span className="text-xs text-text-secondary">共同词：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.common_words.map((word) => (
                      <span key={word} className="text-xs px-1.5 py-0.5 bg-background border border-border rounded">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <ul className="space-y-2">
                {diff.articles.map((article) => (
                  <li key={article.article_id} className="text-sm bg-background rounded-lg p-2">
                    <div className="font-medium text-text-primary">{article.title}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{article.source_name}</div>
                    {article.summary && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-3">{article.summary}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
