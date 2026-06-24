import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStories } from "../api/stories";
import { StoryCard } from "../components/StoryCard";
import { StoryDrawer } from "../components/StoryDrawer";
import type { Story } from "../api/types";
import { Loader2, SlidersHorizontal, AlertCircle, RotateCcw } from "lucide-react";
import { useDashboardContext } from "../hooks/useDashboardContext";

type SortOption =
  | "heat_desc"
  | "updated_desc"
  | "sources_desc"
  | "articles_desc";

const STATUS_OPTIONS = ["all", "new", "developing", "stable"] as const;

export function StoriesPage() {
  const { searchQuery, hours } = useDashboardContext();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [sortBy, setSortBy] = useState<SortOption>("heat_desc");
  const queryClient = useQueryClient();

  const trimmedQuery = searchQuery.trim();

  const {
    data: stories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["stories", { limit: 200, hours, q: trimmedQuery }],
    queryFn: () =>
      listStories({
        limit: 200,
        hours: hours ?? undefined,
        q: trimmedQuery || undefined,
      }),
  });

  function handleRetry() {
    queryClient.invalidateQueries({ queryKey: ["stories"] });
  }

  const filteredStories = useMemo(() => {
    let result = [...stories];

    if (status !== "all") {
      result = result.filter((s) => s.status === status);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "updated_desc":
          return (
            new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime()
          );
        case "sources_desc":
          return b.source_count - a.source_count;
        case "articles_desc":
          return b.article_count - a.article_count;
        case "heat_desc":
        default:
          return b.heat_score - a.heat_score;
      }
    });

    return result;
  }, [stories, status, sortBy]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold">报道</h2>
          <p className="text-sm text-text-secondary">
            {filteredStories.length} / {stories.length} 条报道
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
            <SlidersHorizontal className="w-4 h-4 text-text-secondary" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
              className="bg-transparent text-sm text-text-primary outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "全部状态" : s === "new" ? "最新" : s === "developing" ? "进展中" : "稳定"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-sm text-text-primary outline-none"
            >
              <option value="heat_desc">按热度排序</option>
              <option value="updated_desc">按最新排序</option>
              <option value="sources_desc">按来源数排序</option>
              <option value="articles_desc">按文章数排序</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          正在加载报道...
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-1">
            加载报道失败
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {error instanceof Error ? error.message : "出了点问题，请重试。"}
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重试
          </button>
        </div>
      ) : filteredStories.length > 0 ? (
        <div className="space-y-3">
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              variant="compact"
              onClick={() => setSelectedStory(story)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
          没有符合所选筛选条件的报道。
        </div>
      )}

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}
