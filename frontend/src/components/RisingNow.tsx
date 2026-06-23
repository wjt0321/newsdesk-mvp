import type { Story } from "../api/types";
import { ArrowUpRight, Zap } from "lucide-react";
import clsx from "clsx";

interface RisingNowProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export function RisingNow({ stories, onStoryClick }: RisingNowProps) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Rising Now
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => onStoryClick(story)}
            className="group flex items-center gap-3 bg-surface border border-border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-accent/30 transition-all text-left"
          >
            <div
              className={clsx(
                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                story.status === "new"
                  ? "bg-green-100 text-green-700"
                  : story.status === "developing"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-text-primary text-sm leading-snug line-clamp-2">
                {story.short_title || story.canonical_title}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                <span
                  className={clsx(
                    "font-medium capitalize",
                    story.status === "new"
                      ? "text-green-700"
                      : story.status === "developing"
                      ? "text-blue-700"
                      : "text-amber-700"
                  )}
                >
                  {story.status}
                </span>
                <span>{story.source_count} sources</span>
                <span className="flex items-center gap-1 text-amber">
                  <Zap className="w-3 h-3" />
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
