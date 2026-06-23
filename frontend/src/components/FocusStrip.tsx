import type { Story } from "../api/types";
import { Flame, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { formatStoryStatus } from "../lib/format";

interface FocusStripProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export function FocusStrip({ stories, onStoryClick }: FocusStripProps) {
  const focusStories = stories.slice(0, 5);

  if (focusStories.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          焦点
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {focusStories.map((story, index) => (
          <button
            key={story.id}
            onClick={() => onStoryClick(story)}
            className="group text-left bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center text-xs font-bold text-text-secondary">
                #{index + 1}
              </span>
              <span
                className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap",
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
            </div>

            <h3 className="font-semibold text-text-primary leading-snug line-clamp-2 mb-2">
              {story.short_title || story.canonical_title}
            </h3>

            {story.short_title && story.short_title !== story.canonical_title && (
              <p className="text-xs text-text-secondary line-clamp-1 mb-3">
                {story.canonical_title}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-text-secondary mt-auto">
              <div className="flex items-center gap-3">
                <span>{story.source_count} 来源</span>
                <span className="flex items-center gap-1 text-amber">
                  <Flame className="w-3 h-3" />
                  {story.heat_score.toFixed(1)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
