import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { Article, Story } from "../api/types";
import {
  X,
  Clock,
  Calendar,
  GitMerge,
  AlertTriangle,
  Diff,
  CheckCircle2,
  Copy,
} from "lucide-react";
import clsx from "clsx";
import {
  displayArticleSummary,
  displayArticleTitle,
  displayStoryTitle,
  formatRelativeTime,
  formatStoryStatus,
  storySources,
} from "../lib/format";
import { listSources } from "../api/sources";
import { api } from "../api/client";
import { SourceChips } from "./news/SourceChips";
import { SignalBadge } from "./news/SignalBadge";
import { toast } from "sonner";
import { ArticleDrawer } from "./ArticleDrawer";

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

function generatePlaceholderSummary(story: Story): string {
  // Transparent placeholder when no AI summary is available.
  const sourceText =
    story.source_names.length > 1
      ? `${story.source_names.slice(0, 3).join("、")} 等 ${story.source_names.length} 个来源`
      : story.source_names[0] || "未知来源";

  return `【占位摘要 · 待生成】目前 ${sourceText} 报道了此事。系统根据标题与来源判断这是一条${formatStoryStatus(
    story.status
  )}事件，置信度 ${(story.confidence * 100).toFixed(0)}%。打开下方原始文章可查看完整报道。`;
}

export function StoryDrawer({ story, onClose }: StoryDrawerProps) {
  const sourceNameById = useSourceNameLookup();
  const { data: diff } = useStoryDiff(story?.id);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const summary = useMemo(() => {
    if (!story) return "";
    // Prefer a cleaned summary from any article; otherwise transparent placeholder.
    const candidate =
      story.clean_summary ||
      story.articles.find((a) => a.clean_summary)?.clean_summary ||
      story.articles.find((a) => a.summary_raw)?.summary_raw ||
      story.articles.find((a) => a.content_text)?.content_text?.slice(0, 240);
    return candidate || generatePlaceholderSummary(story);
  }, [story]);

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  }

  if (!story) return null;

  const briefText = `${displayStoryTitle(story)}\n来源：${story.source_names.join(
    "、"
  )}\n更新：${formatRelativeTime(story.last_updated_at)}`;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 w-full max-w-lg bg-surface border-l border-border shadow-xl z-50 flex flex-col">
        <div className="h-14 border-b border-border flex items-center justify-between px-5 flex-shrink-0 bg-surface">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">故事简报</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCopy(briefText)}
              className="p-1.5 rounded-md hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors"
              aria-label="复制简报"
              title="复制简报"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors"
              aria-label="关闭"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <header className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge story={story} />
              <SourceChips sources={storySources(story)} max={6} clickable />
            </div>

            <h2 className="text-2xl font-semibold text-text-primary leading-tight text-balance">
              {displayStoryTitle(story)}
            </h2>

            {story.clean_summary && (
              <p className="text-base text-text-secondary leading-relaxed">
                {story.clean_summary}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              <SignalBadge type="sources" value={story.source_count} />
              <SignalBadge type="articles" value={story.article_count} />
              <SignalBadge type="heat" value={story.heat_score.toFixed(1)} />
              <span className="inline-flex items-center gap-1 text-text-tertiary">
                <Clock className="w-3 h-3" />
                更新于 {formatRelativeTime(story.last_updated_at)}
              </span>
            </div>
          </header>

          <section className="bg-surface-subtle/50 rounded-2xl p-5 border border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
              一句话发生了什么
            </h3>
            <p className="text-[15px] leading-editorial text-text-primary">
              {summary}
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              关键线索
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <MetaItem
                icon={Calendar}
                label="首次出现"
                value={new Date(story.first_seen_at).toLocaleString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
              <MetaItem
                icon={GitMerge}
                label="合并依据"
                value={story.merge_reason ?? "未知"}
              />
              <MetaItem
                icon={CheckCircle2}
                label="置信度"
                value={`${(story.confidence * 100).toFixed(0)}%`}
              />
              {story.needs_review && (
                <div className="flex items-center gap-2 text-amber">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">需复核</span>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              原始文章
            </h3>
            <ul className="space-y-2">
              {story.articles.map((article) => (
                <li
                  key={article.id}
                  className="group rounded-xl border border-border bg-surface-subtle/30 hover:bg-surface-subtle transition-colors"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedArticle(article);
                    }}
                    className="flex items-start gap-3 text-left w-full p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                        {displayArticleTitle(article)}
                      </p>
                      {displayArticleSummary(article) && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {displayArticleSummary(article)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-tertiary">
                        <span className="font-medium text-text-secondary">
                          {sourceNameById.get(article.source_id) || article.source_name || `来源 #${article.source_id}`}
                        </span>
                        {article.published_at && (
                          <span>{formatRelativeTime(article.published_at)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {diff && diff.articles.length > 1 && (
            <section className="border-t border-border pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-1.5">
                <Diff className="w-4 h-4" />
                来源差异
              </h3>

              {diff.common_words.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs text-text-tertiary">共同关注：</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {diff.common_words.map((word) => (
                      <span
                        key={word}
                        className="text-xs px-2 py-0.5 bg-surface-subtle border border-border rounded-md text-text-secondary"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <ul className="space-y-3">
                {diff.articles.map((article) => (
                  <li
                    key={article.article_id}
                    className="text-sm border-l-2 border-border pl-3 py-0.5"
                  >
                    <div className="font-medium text-text-primary">
                      {article.title}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {article.source_name}
                    </div>
                    {article.summary && (
                      <p className="text-xs text-text-secondary mt-1.5 leading-relaxed line-clamp-3">
                        {article.summary}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>

      <ArticleDrawer
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      <div>
        <span className="text-xs text-text-tertiary block">{label}</span>
        <span className="text-sm text-text-primary">{value}</span>
      </div>
    </div>
  );
}

function StatusBadge({ story }: { story: Story }) {
  const isHot = story.status === "breaking" || story.status === "hot";
  if (!isHot && !story.needs_review) return null;

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
        story.status === "breaking"
          ? "bg-red-100 text-danger"
          : story.status === "hot"
          ? "bg-amber/10 text-amber"
          : "bg-amber/10 text-amber"
      )}
    >
      {story.needs_review && story.status !== "breaking" && story.status !== "hot"
        ? "需复核"
        : formatStoryStatus(story.status)}
    </span>
  );
}
