import type { Story } from "../api/types";
import clsx from "clsx";
import { formatRelativeTime, formatStoryStatus } from "../lib/format";
import { SourceChips } from "./news/SourceChips";
import { SignalGroup } from "./news/SignalBadge";

interface StoryCardProps {
  story: Story;
  onClick?: () => void;
  variant?: "default" | "compact";
}

export function StoryCard({ story, onClick, variant = "default" }: StoryCardProps) {
  const isVerified = !story.needs_review && story.confidence >= 0.7;

  if (variant === "compact") {
    return (
      <article
        onClick={onClick}
        className={clsx(
          "group cursor-pointer w-full text-left bg-surface border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-sm hover:border-accent/20",
          !isVerified && "opacity-90"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
              {story.short_title || story.canonical_title}
            </h3>
            {story.short_title && story.short_title !== story.canonical_title && (
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                {story.canonical_title}
              </p>
            )}
          </div>
          <StatusPill story={story} />
        </div>

        <div className="mt-2.5">
          <SourceChips names={story.source_names} max={3} />
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <SignalGroup story={story} />
          <span className="text-[11px] text-text-tertiary tabular-nums">
            {formatRelativeTime(story.last_updated_at)}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={onClick}
      className={clsx(
        "group cursor-pointer w-full text-left bg-surface border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:border-accent/20",
        !isVerified && "opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
            {story.short_title || story.canonical_title}
          </h3>
          {story.short_title && story.short_title !== story.canonical_title && (
            <p className="text-sm text-text-secondary mt-1 line-clamp-1">
              {story.canonical_title}
            </p>
          )}
        </div>
        <StatusPill story={story} />
      </div>

      <div className="mt-3">
        <SourceChips names={story.source_names} max={5} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <SignalGroup story={story} />
        <span className="text-xs text-text-tertiary tabular-nums">
          {formatRelativeTime(story.last_updated_at)}
        </span>
      </div>
    </article>
  );
}

function StatusPill({ story }: { story: Story }) {
  const status = story.status;
  const isHot = status === "breaking" || status === "hot";
  if (!isHot) return null;

  return (
    <span
      className={clsx(
        "flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
        status === "breaking"
          ? "bg-red-100 text-danger"
          : "bg-amber/10 text-amber"
      )}
    >
      {formatStoryStatus(status)}
    </span>
  );
}
