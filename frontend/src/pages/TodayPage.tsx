import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStories } from "../api/stories";
import type { Story } from "../api/types";
import { HeroStory } from "../components/news/HeroStory";
import { SecondaryStory } from "../components/news/SecondaryStory";
import { StoryCard } from "../components/StoryCard";
import { StoryDrawer } from "../components/StoryDrawer";
import { RisingNow } from "../components/RisingNow";
import { HealthStats } from "../components/HealthStats";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import {
  Loader2,
  AlertCircle,
  RotateCcw,
  Newspaper,
  PlusCircle,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useDashboardContext } from "../hooks/useDashboardContext";

function primarySourceName(story: Story): string {
  return story.source_names[0] || "未知";
}

function applySourceDiversity(stories: Story[], maxSameSource: number = 2): Story[] {
  const remaining = [...stories];
  const result: Story[] = [];
  let consecutiveSameSource = 0;
  let lastSource = "";

  while (remaining.length > 0) {
    let pickedIdx = 0;
    if (lastSource && consecutiveSameSource >= maxSameSource) {
      const differentIdx = remaining.findIndex((s) => primarySourceName(s) !== lastSource);
      if (differentIdx >= 0) {
        pickedIdx = differentIdx;
      }
    }

    const picked = remaining.splice(pickedIdx, 1)[0];
    const source = primarySourceName(picked);
    if (source === lastSource) {
      consecutiveSameSource += 1;
    } else {
      consecutiveSameSource = 1;
      lastSource = source;
    }
    result.push(picked);
  }

  return result;
}

function scoreForTodaySort(story: Story): number {
  let score = story.heat_score;

  if (story.needs_review) {
    score -= 50;
  }
  if (story.confidence < 0.7) {
    score -= 20;
  }
  if (story.source_count >= 2) {
    score += 10;
  }
  if (story.article_count === 1 && story.heat_score < 50) {
    score -= 15;
  }

  return score;
}

function storyMatchesQuery(story: Story, query: string) {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    story.canonical_title.toLowerCase().includes(q) ||
    (story.short_title && story.short_title.toLowerCase().includes(q))
  );
}

function sourceDominanceWarning(stories: Story[]): { source: string; ratio: number } | null {
  if (stories.length === 0) return null;
  const counts = new Map<string, number>();
  stories.slice(0, 20).forEach((s) => {
    const name = primarySourceName(s);
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  const [topSource, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || ["", 0];
  const ratio = topCount / Math.min(stories.length, 20);
  return ratio > 0.3 ? { source: topSource, ratio } : null;
}

export function TodayPage() {
  const { searchQuery, hours } = useDashboardContext();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const queryClient = useQueryClient();

  const {
    data: stories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["stories", { limit: 100, hours }],
    queryFn: () => listStories({ limit: 100, hours: hours ?? undefined }),
  });

  const filteredStories = useMemo(
    () => stories.filter((story) => storyMatchesQuery(story, searchQuery)),
    [stories, searchQuery]
  );

  const sortedByQuality = useMemo(
    () => [...filteredStories].sort((a, b) => scoreForTodaySort(b) - scoreForTodaySort(a)),
    [filteredStories]
  );

  const highConfidenceStories = sortedByQuality.filter(
    (story) => !story.needs_review && story.confidence >= 0.7
  );

  const focusStories = applySourceDiversity(highConfidenceStories, 2);
  const heroStory = focusStories[0] || null;
  const secondaryStories = focusStories.slice(1, 4);

  const risingStories = applySourceDiversity(
    sortedByQuality.filter((story) => story.status === "new" || story.status === "developing"),
    2
  ).slice(0, 6);

  const moreStories = applySourceDiversity(sortedByQuality, 3).slice(0, 20);

  const pendingReview = sortedByQuality
    .filter((story) => story.needs_review || story.confidence < 0.7)
    .slice(0, 5);

  const dominance = useMemo(() => sourceDominanceWarning(sortedByQuality), [sortedByQuality]);

  function handleRetry() {
    toast.info("正在刷新数据...");
    queryClient.refetchQueries({ queryKey: ["stories"] });
    queryClient.refetchQueries({ queryKey: ["sources"] });
    queryClient.refetchQueries({ queryKey: ["source-health"] });
    queryClient.refetchQueries({ queryKey: ["watch-rules"] });
    queryClient.refetchQueries({ queryKey: ["channels"] });
    queryClient.refetchQueries({ queryKey: ["briefing"] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>正在加载今日简报...</span>
      </div>
    );
  }

  if (isError) {
    const isConnectionError =
      error instanceof Error &&
      (error.message.includes("Network Error") || error.message.includes("ERR_CONNECTION_REFUSED"));

    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-surface border border-danger/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-danger mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            加载今日简报失败
          </h3>
          <p className="text-sm text-text-secondary mb-2">
            {error instanceof Error ? error.message : "出了点问题，请重试。"}
          </p>
          {isConnectionError && (
            <p className="text-xs text-text-tertiary mb-4">
              看起来后端未运行。请使用以下命令启动：{" "}
              <code className="bg-surface-subtle px-1.5 py-0.5 rounded">
                backend/.venv/Scripts/python -m uvicorn app.main:app
              </code>
            </p>
          )}
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重试
          </button>
        </div>
      </div>
    );
  }

  if (filteredStories.length === 0 && !isLoading) {
    return (
      <div className="p-6">
        <PageHeader />
        <div className="max-w-2xl mx-auto mt-6">
          <EmptyState
            icon={Newspaper}
            title="暂无报道"
            description="添加几个 RSS 来源并运行抓取，即可开始查看简报。如果已有来源，请等待下次定时抓取或手动触发。"
          >
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/sources"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                添加来源
              </Link>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface-subtle border border-border text-text-primary rounded-lg hover:bg-surface transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                刷新
              </button>
            </div>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader count={filteredStories.length} />

      {dominance && (
        <div className="mb-5 bg-amber/5 border border-amber/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{dominance.source}</span>{" "}
            在 Top 20 中占比 {Math.round(dominance.ratio * 100)}%，建议关注来源多样性。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-8">
          {heroStory && (
            <section>
              <SectionHeader title="今日重点" icon={TrendingUp} />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7">
                  <HeroStory story={heroStory} onClick={() => setSelectedStory(heroStory)} />
                </div>
                <div className="lg:col-span-5 flex flex-col gap-3">
                  {secondaryStories.map((story) => (
                    <SecondaryStory
                      key={story.id}
                      story={story}
                      onClick={() => setSelectedStory(story)}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          <RisingNow stories={risingStories} onStoryClick={setSelectedStory} />

          <section>
            <SectionHeader title="更多新闻" icon={Clock} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {moreStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  variant="compact"
                  onClick={() => setSelectedStory(story)}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="xl:col-span-4 space-y-6">
          <HealthStats />

          {pendingReview.length > 0 && (
            <section className="bg-surface border border-border rounded-2xl p-5">
              <SectionHeader title="待复核" icon={AlertTriangle} />
              <div className="space-y-3">
                {pendingReview.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => setSelectedStory(story)}
                    className="w-full text-left group"
                  >
                    <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-accent transition-colors">
                      {story.short_title || story.canonical_title}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {story.needs_review ? "需审核" : `置信度 ${(story.confidence * 100).toFixed(0)}%`}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}

function PageHeader({ count }: { count?: number }) {
  const today = new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-6">
      <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
        {today}
      </p>
      <h1 className="text-2xl font-semibold text-text-primary">今日情报</h1>
      {typeof count === "number" && (
        <p className="text-sm text-text-secondary mt-1">
          当前周期内 {count} 条报道
        </p>
      )}
    </div>
  );
}
