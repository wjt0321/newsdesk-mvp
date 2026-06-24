import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSource as getSource } from "../api/sources";
import { listArticles } from "../api/articles";
import { listFetchLogs } from "../api/fetchLogs";
import { StoryCard } from "../components/StoryCard";
import { StoryDrawer } from "../components/StoryDrawer";
import { ArticleDrawer } from "../components/ArticleDrawer";
import type { Article, Story } from "../api/types";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Newspaper,
  Clock,
  Activity,
  ExternalLink,
  RefreshCw,
  Rss,
  Globe,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { formatRelativeTime, formatStoryStatus } from "../lib/format";

function useSourceStories(sourceId: number) {
  return useQuery({
    queryKey: ["stories", "by-source", sourceId],
    queryFn: async () => {
      const { data } = await api.get<Story[]>(`/stories/by-source/${sourceId}`, {
        params: { limit: 50 },
      });
      return data;
    },
    enabled: !!sourceId,
  });
}

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sourceId = Number(id);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const {
    data: source,
    isLoading: sourceLoading,
    isError: sourceError,
    error: sourceErrorObj,
  } = useQuery({
    queryKey: ["source", sourceId],
    queryFn: () => getSource(sourceId),
    enabled: !!sourceId,
  });

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["articles", { source_id: sourceId, limit: 30 }],
    queryFn: () => listArticles({ source_id: sourceId, limit: 30 }),
    enabled: !!sourceId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["fetch-logs", { source_id: sourceId, limit: 10 }],
    queryFn: () => listFetchLogs({ source_id: sourceId, limit: 10 }),
    enabled: !!sourceId,
  });

  const { data: stories = [], isLoading: storiesLoading } = useSourceStories(sourceId);

  async function handleFetch() {
    try {
      await api.post(`/api/sources/${sourceId}/fetch?background=true`);
      toast.success("已触发抓取");
    } catch {
      toast.error("触发抓取失败");
    }
  }

  if (sourceLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        正在加载来源详情...
      </div>
    );
  }

  if (sourceError || !source) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800">来源加载失败</h3>
          <p className="text-sm text-red-700 mt-1">
            {sourceErrorObj instanceof Error ? sourceErrorObj.message : "未找到该来源"}
          </p>
          <Link
            to="/sources"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <ArrowLeft className="w-4 h-4" />
            返回来源列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          to="/sources"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          返回来源列表
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{source.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                {source.category}
              </span>
              <span className="inline-flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {source.region}
              </span>
              <span className="inline-flex items-center gap-1">
                <Rss className="w-3.5 h-3.5" />
                {source.type}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                每 {source.fetch_interval_minutes} 分钟
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFetch}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              立即抓取
            </button>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface-subtle border border-border text-text-primary rounded-lg hover:bg-surface transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              源地址
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              最近文章
            </h2>
            {articlesLoading ? (
              <div className="text-center py-8 text-text-secondary">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-2">
                {articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="w-full text-left bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-text-primary line-clamp-2">
                      {article.clean_title || article.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-text-tertiary">
                      {article.published_at && (
                        <span>{formatRelativeTime(article.published_at)}</span>
                      )}
                      {article.clean_summary && (
                        <span className="line-clamp-1 flex-1">{article.clean_summary}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">暂无文章</p>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              进入的报道
            </h2>
            {storiesLoading ? (
              <div className="text-center py-8 text-text-secondary">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            ) : stories.length > 0 ? (
              <div className="space-y-3">
                {stories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    variant="compact"
                    onClick={() => setSelectedStory(story)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">暂无相关报道</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              抓取记录
            </h3>
            {logs.length > 0 ? (
              <ul className="space-y-2">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
                        log.status === "success"
                          ? "bg-emerald-50 text-emerald-600"
                          : log.status === "failed"
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {formatStoryStatus(log.status)}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {formatRelativeTime(log.started_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">暂无记录</p>
            )}
          </section>
        </aside>
      </div>

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
      <ArticleDrawer article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}
