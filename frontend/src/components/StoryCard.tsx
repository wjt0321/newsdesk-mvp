import type { Story } from "../api/types";
import { Flame, Newspaper, ExternalLink, Clock } from "lucide-react";
import clsx from "clsx";
import { formatRelativeTime } from "../lib/format";

interface StoryCardProps {
  story: Story;
  onClick?: () => void;
  variant?: "default" | "compact";
}

export function StoryCard({ story, onClick, variant = "default" }: StoryCardProps) {
  const statusClass =
    story.status === "breaking"
      ? "bg-red-100 text-red-700"
      : story.status === "hot"
      ? "bg-amber-100 text-amber-700"
      : story.status === "new"
      ? "bg-green-100 text-green-700"
      : story.status === "developing"
      ? "bg-blue-100 text-blue-700"
      : "bg-gray-100 text-text-secondary";

  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-surface border border-border rounded-lg p-3 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-text-primary text-sm leading-snug line-clamp-1">
              {story.short_title || story.canonical_title}
            </h3>
            {story.short_title && story.short_title !== story.canonical_title && (
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                {story.canonical_title}
              </p>
            )}
          </div>
          <span
            className={clsx(
              "text-[10px] px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap",
              statusClass
            )}
          >
            {story.status}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <Newspaper className="w-3 h-3" />
            <span>{story.source_count} sources</span>
          </div>
          <div className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <span>{story.article_count} articles</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber" />
            <span>{story.heat_score.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(story.last_updated_at)}</span>
          </div>
        </div>

        {story.source_names.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
            {story.source_names.slice(0, 4).map((name) => (
              <span
                key={name}
                className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-text-secondary truncate max-w-[80px]"
              >
                {name}
              </span>
            ))}
            {story.source_names.length > 4 && (
              <span className="text-[10px] text-text-secondary">
                +{story.source_names.length - 4}
              </span>
            )}
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary leading-snug truncate">
            {story.short_title || story.canonical_title}
          </h3>
          <p className="text-sm text-text-secondary mt-1 line-clamp-1">
            {story.canonical_title}
          </p>
        </div>
        <span
          className={clsx(
            "text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap",
            statusClass
          )}
        >
          {story.status}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <Newspaper className="w-3.5 h-3.5" />
          <span>{story.source_count} sources</span>
        </div>
        <div className="flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{story.article_count} articles</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" />
          <span>{story.heat_score.toFixed(1)} heat</span>
        </div>
        <span className="ml-auto">
          {new Date(story.last_updated_at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {(story.needs_review || story.confidence < 0.7 || story.merge_reason) && (
        <div className="flex items-center gap-2 mt-2 text-[10px]">
          {story.needs_review && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              needs review
            </span>
          )}
          {!story.needs_review && story.confidence < 0.7 && (
            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-text-secondary">
              confidence {(story.confidence * 100).toFixed(0)}%
            </span>
          )}
          {story.merge_reason && (
            <span className="px-1.5 py-0.5 rounded bg-background border border-border text-text-secondary">
              {story.merge_reason}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
