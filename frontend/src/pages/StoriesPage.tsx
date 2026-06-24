import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listStories } from "../api/stories";
import { StoryCard } from "../components/StoryCard";
import { StoryDrawer } from "../components/StoryDrawer";
import type { Story } from "../api/types";
import {
  Newspaper,
  SlidersHorizontal,
  Flame,
  Clock,
  Users,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useDashboardContext } from "../hooks/useDashboardContext";
import { PageEmpty, PageError, PageLoading } from "../components/ui/PageStatus";
import { useRefreshDashboard } from "../hooks/useRefreshDashboard";
import clsx from "clsx";

type SortOption =
  | "heat_desc"
  | "updated_desc"
  | "sources_desc"
  | "articles_desc";

type StatusFilter = "all" | "new" | "developing" | "stable";

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "new", label: "最新" },
  { value: "developing", label: "进展中" },
  { value: "stable", label: "稳定" },
];

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof Flame }[] = [
  { value: "heat_desc", label: "热度", icon: Flame },
  { value: "updated_desc", label: "最新", icon: Clock },
  { value: "sources_desc", label: "来源数", icon: Users },
  { value: "articles_desc", label: "文章数", icon: FileText },
];

export function StoriesPage() {
  const { hours } = useDashboardContext();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("heat_desc");
  const [showReviewOnly, setShowReviewOnly] = useState(false);
  const { refreshDashboard } = useRefreshDashboard();

  const {
    data: stories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["stories", { limit: 200, hours }],
    queryFn: () =>
      listStories({
        limit: 200,
        hours: hours ?? undefined,
      }),
  });

  const filteredStories = useMemo(() => {
    let result = [...stories];

    if (status !== "all") {
      result = result.filter((s) => s.status === status);
    }

    if (showReviewOnly) {
      result = result.filter((s) => s.needs_review || s.confidence < 0.7);
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
  }, [stories, status, sortBy, showReviewOnly]);

  const reviewCount = stories.filter(
    (s) => s.needs_review || s.confidence < 0.7
  ).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
          报道浏览
        </p>
        <h2 className="text-2xl font-semibold">报道</h2>
        <p className="text-sm text-text-secondary mt-1">
          {filteredStories.length}
          {filteredStories.length !== stories.length && ` / ${stories.length}`} 条报道
          {hours && (
            <span className="text-text-tertiary ml-1">
              · 最近 {hours}h
            </span>
          )}
        </p>
      </div>

      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setStatus(chip.value)}
              className={clsx(
                "inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                status === chip.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surface text-text-secondary hover:border-accent/50 hover:text-accent"
              )}
            >
              {chip.label}
            </button>
          ))}
          {reviewCount > 0 && (
            <button
              onClick={() => setShowReviewOnly((v) => !v)}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                showReviewOnly
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-border bg-surface text-text-secondary hover:border-amber/50 hover:text-amber"
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              需复核
              <span className="tabular-nums">{reviewCount}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-text-tertiary" />
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={clsx(
                  "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                  sortBy === opt.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-text-secondary hover:border-accent/50 hover:text-accent"
                )}
              >
                <Icon className="w-3 h-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <PageLoading label="正在加载报道..." />
      ) : isError ? (
        <PageError
          title="加载报道失败"
          description={error instanceof Error ? error.message : "出了点问题，请重试。"}
          onRetry={refreshDashboard}
        />
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
        <PageEmpty
          icon={Newspaper}
          title="没有符合条件的报道"
          description="试试放宽时间范围、清空搜索词，或切换状态筛选。"
        />
      )}

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}
