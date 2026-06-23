import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStories } from "../api/stories";
import type { Story } from "../api/types";

function primarySourceName(story: Story): string {
  return story.source_names[0] || "unknown";
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
    queryClient.invalidateQueries({ queryKey: ["articles"] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading today&apos;s briefing...</span>
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
            Failed to load today&apos;s briefing
          </h3>
          <p className="text-sm text-red-700 mb-2">
            {error instanceof Error ? error.message : "Something went wrong. Please try again."}
          </p>
          {isConnectionError && (
            <p className="text-xs text-red-600 mb-4">
              Looks like the backend is not running. Start it with{" "}
              <code className="bg-red-100 px-1 py-0.5 rounded">backend/.venv/Scripts/python -m uvicorn app.main:app</code>
            </p>
          )}
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Today</h2>
          <p className="text-sm text-text-secondary">
            {filteredStories.length > 0
              ? `${filteredStories.length} stories in the current cycle`
              : "No stories yet"}
          </p>
        </div>
      </div>

      <HealthStats />

      {filteredStories.length === 0 && !isLoading && (
        <div className="bg-surface border border-border rounded-xl p-8 text-center mb-6">
          <Newspaper className="w-10 h-10 text-text-secondary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            No stories yet
          </h3>
          <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
            Add a few RSS sources and run a fetch to start seeing your briefing.
            If sources already exist, wait for the next scheduled fetch or trigger one manually.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="#/sources"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Add sources
            </a>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-background border border-border rounded-lg hover:bg-surface transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Refresh
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
