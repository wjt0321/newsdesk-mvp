import type { Story } from "../api/types";
import clsx from "clsx";
import {
  displayStorySubtitle,
  displayStoryTitle,
  formatRelativeTime,
  formatStoryStatus,
  storySources,
} from "../lib/format";
import { SourceChips } from "./news/SourceChips";
import { SignalGroup } from "./news/SignalBadge";

interface StoryCardProps {
  story: Story;
  onClick?: () => void;
  variant?: "default" | "compact";
}

export function StoryCard({ story, onClick, variant = "default" }: StoryCardProps) {
  const isVerified = !story.needs_review && story.confidence >= 0.7;
  const sources = storySources(story);

  if (variant === "compact") {
    return (
      <article
        className={clsx(
          "w-full bg-surface border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-sm hover:border-accent/20 focus-within:border-accent/30 focus-within:ring-2 focus-within:ring-accent/10",
          !isVerified && "opacity-90"
        )}
      >
        <StoryCardAction onClick={onClick} title={displayStoryTitle(story)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                {displayStoryTitle(story)}
              </h3>
              {displayStorySubtitle(story) && (
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                  {displayStorySubtitle(story)}
                </p>
              )}
            </div>
            <StatusPill story={story} />
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <SignalGroup story={story} />
            <span className="text-[11px] text-text-tertiary tabular-nums">
              {formatRelativeTime(story.last_updated_at)}
            </span>
          </div>
        </StoryCardAction>

        <div className="mt-2.5">
          <SourceChips sources={sources} max={3} clickable />
        </div>
      </article>
    );
  }

  return (
    <article
      className={clsx(
        "w-full bg-surface border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:border-accent/20 focus-within:border-accent/30 focus-within:ring-2 focus-within:ring-accent/10",
        !isVerified && "opacity-90"
      )}
    >
      <StoryCardAction onClick={onClick} title={displayStoryTitle(story)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
              {displayStoryTitle(story)}
            </h3>
            {displayStorySubtitle(story) && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-1">
                {displayStorySubtitle(story)}
              </p>
            )}
          </div>
          <StatusPill story={story} />
        </div>

        <div className="flex items-center justify-between mt-3">
          <SignalGroup story={story} />
          <span className="text-xs text-text-tertiary tabular-nums">
            {formatRelativeTime(story.last_updated_at)}
          </span>
        </div>
      </StoryCardAction>

      <div className="mt-3">
        <SourceChips sources={sources} max={5} clickable />
      </div>
    </article>
  );
}

function StoryCardAction({
  onClick,
  title,
  children,
}: {
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!onClick) {
    return <div>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`打开报道：${title}`}
      className="group block w-full text-left focus-visible:outline-none"
    >
      {children}
    </button>
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
