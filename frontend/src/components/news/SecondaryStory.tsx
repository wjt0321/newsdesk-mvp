import type { Story } from "../../api/types";
import { formatRelativeTime, formatStoryStatus } from "../../lib/format";
import { SourceChips } from "./SourceChips";
import { SignalGroup } from "./SignalBadge";
import clsx from "clsx";

interface SecondaryStoryProps {
  story: Story;
  onClick: () => void;
}

export function SecondaryStory({ story, onClick }: SecondaryStoryProps) {
  const isVerified = !story.needs_review && story.confidence >= 0.7;

  return (
    <article
      onClick={onClick}
      className={clsx(
        "group cursor-pointer rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:shadow-sm hover:border-accent/20",
        !isVerified && "opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-text-primary leading-snug line-clamp-2 text-balance flex-1">
          {story.short_title || story.canonical_title}
        </h4>
        <StatusPill story={story} />
      </div>

      {story.short_title && story.short_title !== story.canonical_title && (
        <p className="text-sm text-text-secondary line-clamp-1 mb-2">
          {story.canonical_title}
        </p>
      )}

      <SourceChips names={story.source_names} max={3} />

      <div className="mt-3 flex items-center justify-between">
        <SignalGroup story={story} />
        <span className="text-[11px] text-text-tertiary tabular-nums">
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
