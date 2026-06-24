import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listStories } from "../api/stories";
import { storyHasImage } from "../lib/format";
import type { Story } from "../api/types";
import { useDashboardContext } from "../hooks/useDashboardContext";

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

function primarySourceName(story: Story): string {
  return story.source_names?.[0] || "未知";
}

function applySourceDiversity(stories: Story[], maxPerSource: number): Story[] {
  const result: Story[] = [];
  const sourceCounts = new Map<string, number>();

  for (const story of stories) {
    const source = primarySourceName(story);
    const count = sourceCounts.get(source) || 0;
    if (count >= maxPerSource) continue;
    sourceCounts.set(source, count + 1);
    result.push(story);
  }

  return result;
}

export function sourceDominanceWarning(stories: Story[]): { source: string; ratio: number } | null {
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

export interface TodayStoriesData {
  heroStory: Story | null;
  secondaryStories: Story[];
  imageStories: Story[];
  textStories: Story[];
  risingStories: Story[];
  pendingReview: Story[];
  dominance: { source: string; ratio: number } | null;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useTodayStories(): TodayStoriesData {
  const { hours } = useDashboardContext();

  const {
    data: stories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["stories", { limit: 100, hours }],
    queryFn: () =>
      listStories({
        limit: 100,
        hours: hours ?? undefined,
      }),
  });

  const sortedByQuality = useMemo(
    () => [...stories].sort((a, b) => scoreForTodaySort(b) - scoreForTodaySort(a)),
    [stories]
  );

  const highConfidenceStories = useMemo(
    () => sortedByQuality.filter((story) => !story.needs_review && story.confidence >= 0.7),
    [sortedByQuality]
  );

  const focusStories = useMemo(
    () => applySourceDiversity(highConfidenceStories, 2),
    [highConfidenceStories]
  );

  const heroStory = focusStories[0] || null;
  const secondaryStories = focusStories.slice(1, 4);
  const focusIds = useMemo(
    () => new Set([heroStory?.id, ...secondaryStories.map((s) => s.id)]),
    [heroStory, secondaryStories]
  );

  const imageStories = useMemo(
    () =>
      applySourceDiversity(
        highConfidenceStories.filter((s) => storyHasImage(s) && !focusIds.has(s.id)),
        2
      ).slice(0, 6),
    [highConfidenceStories, focusIds]
  );

  const textStories = useMemo(
    () =>
      applySourceDiversity(
        highConfidenceStories.filter((s) => !storyHasImage(s) && !focusIds.has(s.id)),
        3
      ).slice(0, 12),
    [highConfidenceStories, focusIds]
  );

  const risingStories = useMemo(
    () =>
      applySourceDiversity(
        sortedByQuality.filter((story) => story.status === "new" || story.status === "developing"),
        2
      ).slice(0, 6),
    [sortedByQuality]
  );

  const pendingReview = useMemo(
    () =>
      sortedByQuality
        .filter((story) => story.needs_review || story.confidence < 0.7)
        .slice(0, 5),
    [sortedByQuality]
  );

  const dominance = useMemo(() => sourceDominanceWarning(sortedByQuality), [sortedByQuality]);

  return {
    heroStory,
    secondaryStories,
    imageStories,
    textStories,
    risingStories,
    pendingReview,
    dominance,
    totalCount: stories.length,
    isLoading,
    isError,
    error: error as Error | null,
  };
}
