import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Newspaper, FileText } from "lucide-react";
import { listStories } from "../api/stories";
import { listArticles } from "../api/articles";
import type { Article, Story } from "../api/types";
import { useDashboardContext } from "../hooks/useDashboardContext";
import { useRefreshDashboard } from "../hooks/useRefreshDashboard";
import { PageEmpty, PageError, PageLoading } from "../components/ui/PageStatus";
import { StoryDrawer } from "../components/StoryDrawer";
import { ArticleDrawer } from "../components/ArticleDrawer";
import {
  displayArticleSummary,
  displayArticleTitle,
  displayStoryTitle,
  formatRelativeTime,
  formatStoryStatus,
} from "../lib/format";

export function SearchPage() {
  const { searchQuery, hours } = useDashboardContext();
  const { refreshDashboard } = useRefreshDashboard();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const trimmedQuery = searchQuery.trim();

  const {
    data: stories = [],
    isLoading: storiesLoading,
    isError: storiesError,
    error: storiesErrorObject,
  } = useQuery({
    queryKey: ["search", "stories", { q: trimmedQuery, hours }],
    queryFn: () =>
      listStories({
        limit: 50,
        hours: hours ?? undefined,
        q: trimmedQuery || undefined,
      }),
    enabled: Boolean(trimmedQuery),
  });

  const {
    data: articles = [],
    isLoading: articlesLoading,
    isError: articlesError,
    error: articlesErrorObject,
  } = useQuery({
    queryKey: ["search", "articles", { q: trimmedQuery, hours }],
    queryFn: () =>
      listArticles({
        limit: 50,
        hours: hours ?? undefined,
        q: trimmedQuery || undefined,
      }),
    enabled: Boolean(trimmedQuery),
  });

  const timeScopeLabel = useMemo(() => {
    if (hours === null) return "全部";
    if (hours === 1) return "1h";
    if (hours === 6) return "6h";
    if (hours === 24) return "24h";
    if (hours === 168) return "7d";
    return `${hours}h`;
  }, [hours]);

  const totalCount = stories.length + articles.length;
  const isLoading = trimmedQuery.length > 0 && (storiesLoading || articlesLoading);
  const isError = storiesError || articlesError;
  const errorMessage =
    (storiesErrorObject instanceof Error && storiesErrorObject.message) ||
    (articlesErrorObject instanceof Error && articlesErrorObject.message) ||
    "搜索结果加载失败，请重试。";

  if (!trimmedQuery) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageEmpty
          icon={Search}
          title="输入关键词开始搜索"
          description="顶部搜索框支持按报道标题、摘要、文章正文和来源名称进行检索。"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
          搜索结果
        </p>
        <h1 className="text-2xl font-semibold text-text-primary">
          “{trimmedQuery}”
        </h1>
        <p className="text-sm text-text-secondary mt-2">
          当前窗口 {timeScopeLabel} · 共 {totalCount} 条结果 · Stories {stories.length} 条 ·
          Articles {articles.length} 条
        </p>
      </header>

      {isLoading ? (
        <PageLoading label="正在搜索..." />
      ) : isError ? (
        <PageError title="搜索失败" description={errorMessage} onRetry={refreshDashboard} />
      ) : totalCount === 0 ? (
        <PageEmpty
          icon={Search}
          title="没有找到结果"
          description="试试更短的关键词、放宽时间窗口，或改搜来源名与报道标题。"
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-text-tertiary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Stories
                </h2>
              </div>
              <span className="text-xs text-text-tertiary">{stories.length} 条</span>
            </div>

            {stories.length > 0 ? (
              <div className="space-y-3">
                {stories.map((story) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => setSelectedStory(story)}
                    className="w-full text-left rounded-xl border border-border bg-surface-subtle/30 p-4 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary line-clamp-2">
                        {highlightText(displayStoryTitle(story), trimmedQuery)}
                      </p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-text-secondary border border-border">
                        {formatStoryStatus(story.status)}
                      </span>
                    </div>
                    {story.clean_summary && (
                      <p className="mt-2 text-xs text-text-secondary line-clamp-3 leading-relaxed">
                        {highlightText(story.clean_summary, trimmedQuery)}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-tertiary">
                      <span>{story.source_count} 来源</span>
                      <span>{story.article_count} 篇文章</span>
                      <span>{formatRelativeTime(story.last_updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <PageEmpty
                icon={Newspaper}
                title="没有匹配的 Stories"
                description="当前查询没有命中聚合故事，可以看看右侧 Articles 结果。"
              />
            )}
          </section>

          <section className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-text-tertiary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Articles
                </h2>
              </div>
              <span className="text-xs text-text-tertiary">{articles.length} 条</span>
            </div>

            {articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article) => (
                  <article
                    key={article.id}
                    className="rounded-xl border border-border bg-surface-subtle/30 p-4 hover:bg-surface-subtle transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedArticle(article)}
                      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg"
                    >
                      <p className="text-sm font-medium text-text-primary line-clamp-2">
                        {highlightText(displayArticleTitle(article), trimmedQuery)}
                      </p>
                      {displayArticleSummary(article) && (
                        <p className="mt-2 text-xs text-text-secondary line-clamp-3 leading-relaxed">
                          {highlightText(displayArticleSummary(article)!, trimmedQuery)}
                        </p>
                      )}
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-tertiary">
                      {article.source_id ? (
                        <Link
                          to={`/sources/${article.source_id}`}
                          className="text-accent hover:underline"
                        >
                          {article.source_name || `来源 #${article.source_id}`}
                        </Link>
                      ) : (
                        <span>{article.source_name || "未知来源"}</span>
                      )}
                      <span>{formatRelativeTime(article.published_at || article.fetched_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <PageEmpty
                icon={FileText}
                title="没有匹配的 Articles"
                description="当前查询没有命中文章级结果，可以试试更具体的关键词。"
              />
            )}
          </section>
        </div>
      )}

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
      <ArticleDrawer article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const matcher = new RegExp(`^${escapedQuery}$`, "i");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    matcher.test(part) ? (
      <mark key={`${part}-${index}`} className="bg-amber/20 text-inherit rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}
