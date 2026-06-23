import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStories } from "../api/stories";
import type { Story } from "../api/types";

function primarySourceName(story: Story): string {
  return story.source_names[0] || "未知";
}

function applySourceDiversity(stories: Story[], maxSameSource: number = 2): Story[] {
  // Greedy reorder so no source appears more than maxSameSource times consecutively.
  const remaining = [...stories];
  const result: Story[] = [];
  let consecutiveSameSource = 0;
  let lastSource = "";

  while (remaining.length > 0) {
    let pickedIdx = 0;
    // If we would exceed the limit, find a story from a different source.
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
  // Composite score for Today page sorting.
  // High-confidence, multi-source stories with high heat rank first.
  // Single-article, low-confidence stories are deprioritized unless they are hot.
  let score = story.heat_score;

  // Confidence penalty.
  if (story.needs_review) {
    score -= 50;
  }
  if (story.confidence < 0.7) {
    score -= 20;
  }

  // Multi-source bonus.
  if (story.source_count >= 2) {
    score += 10;
  }

  // Single-article penalty unless the story is hot.
  if (story.article_count === 1 && story.heat_score < 50) {
    score -= 15;
  }

  return score;
}
import { FocusStrip } from "../components/FocusStrip";
import { VisualBoard } from "../components/VisualBoard";
import { TextFeed } from "../components/TextFeed";
import { RisingNow } from "../components/RisingNow";
import { StoryDrawer } from "../components/StoryDrawer";
import { HealthStats } from "../components/HealthStats";
import { Loader2, AlertCircle, RotateCcw, Newspaper, PlusCircle } from "lucide-react";
import { useDashboardContext } from "../hooks/useDashboardContext";

function storyMatchesQuery(story: Story, query: string) {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    story.canonical_title.toLowerCase().includes(q) ||
    (story.short_title && story.short_title.toLowerCase().includes(q))
  );
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

  const focusStories = applySourceDiversity(highConfidenceStories, 2).slice(0, 5);
  const visualStories = applySourceDiversity(
    highConfidenceStories.filter((story) => story.articles.some((article) => article.image_url)),
    2
  ).slice(0, 8);
  const textStories = applySourceDiversity(sortedByQuality, 3).slice(0, 40);
  const risingStories = applySourceDiversity(
    sortedByQuality.filter((story) => story.status === "new" || story.status === "developing"),
    2
  ).slice(0, 6);

  function handleRetry() {
    queryClient.invalidateQueries({ queryKey: ["stories"] });
    queryClient.invalidateQueries({ queryKey: ["sources"] });
    queryClient.invalidateQueries({ queryKey: ["source-health"] });
    queryClient.invalidateQueries({ queryKey: ["watch-rules"] });
    queryClient.invalidateQueries({ queryKey: ["channels"] });
    queryClient.invalidateQueries({ queryKey: ["briefing"] });
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
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-1">
            加载今日简报失败
          </h3>
          <p className="text-sm text-red-700 mb-2">
            {error instanceof Error ? error.message : "出了点问题，请重试。"}
          </p>
          {isConnectionError && (
            <p className="text-xs text-red-600 mb-4">
              看起来后端未运行。请使用以下命令启动：{" "}
              <code className="bg-red-100 px-1 py-0.5 rounded">backend/.venv/Scripts/python -m uvicorn app.main:app</code>
            </p>
          )}
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">今日</h2>
          <p className="text-sm text-text-secondary">
            {filteredStories.length > 0
              ? `当前周期内 ${filteredStories.length} 条报道`
              : "暂无报道"}
          </p>
        </div>
      </div>

      <HealthStats />

      {filteredStories.length === 0 && !isLoading && (
        <div className="bg-surface border border-border rounded-xl p-8 text-center mb-6">
          <Newspaper className="w-10 h-10 text-text-secondary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            暂无报道
          </h3>
          <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
            添加几个 RSS 来源并运行抓取，即可开始查看简报。
            如果已有来源，请等待下次定时抓取或手动触发。
          </p>
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
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-background border border-border rounded-lg hover:bg-surface transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
      )}

      <FocusStrip stories={focusStories} onStoryClick={setSelectedStory} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <VisualBoard stories={visualStories} onStoryClick={setSelectedStory} />
        </div>
        <div className="lg:col-span-3">
          <TextFeed stories={textStories} onStoryClick={setSelectedStory} />
        </div>
      </div>

      <RisingNow stories={risingStories} onStoryClick={setSelectedStory} />

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}
