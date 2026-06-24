import { useState } from "react";
import type { Story } from "../../api/types";
import { displayStorySubtitle, displayStoryTitle, formatStoryStatus } from "../../lib/format";
import { SourceChips } from "./SourceChips";
import { SignalGroup } from "./SignalBadge";
import clsx from "clsx";

interface HeroStoryProps {
  story: Story;
  onClick: () => void;
}

export function HeroStory({ story, onClick }: HeroStoryProps) {
  const [fallback, setFallback] = useState(false);
  const coverImage = story.articles.find((article) => article.image_url)?.image_url;
  const hasImage = !!coverImage && !fallback;

  return (
    <article
      onClick={onClick}
      className={clsx(
        "group cursor-pointer relative overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 hover:shadow-md hover:border-accent/20",
        hasImage ? "min-h-[260px]" : ""
      )}
    >
      {hasImage ? (
        <>
          <img
            src={coverImage}
            alt={displayStoryTitle(story)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="eager"
            onError={() => setFallback(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          <div className="absolute inset-0 p-6 flex flex-col justify-end">
            <StoryContent story={story} variant="overlay" />
          </div>
        </>
      ) : (
        <div className="p-6 flex flex-col justify-between h-full">
          <StoryContent story={story} variant="light" />
        </div>
      )}
    </article>
  );
}

function StoryContent({ story, variant }: { story: Story; variant: "overlay" | "light" }) {
  const textPrimary = variant === "overlay" ? "text-white" : "text-text-primary";
  const textSecondary = variant === "overlay" ? "text-white/80" : "text-text-secondary";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge story={story} variant={variant} />
      </div>

      <h3
        className={clsx(
          "text-2xl font-semibold leading-tight line-clamp-3 text-balance",
          textPrimary
        )}
      >
        {displayStoryTitle(story)}
      </h3>

      {displayStorySubtitle(story) && (
        <p className={clsx("text-sm line-clamp-2", textSecondary)}>
          {displayStorySubtitle(story)}
        </p>
      )}

      <div className={clsx("pt-2", variant === "light" ? "border-t border-border/60" : "")}>
        <SourceChips
          names={story.source_names}
          max={5}
          size="md"
          className={variant === "overlay" ? "[&>span]:bg-white/10 [&>span]:border-white/20 [&>span]:text-white/90" : ""}
        />
        <div className="mt-2">
          <SignalGroup
            story={story}
            showTime
            time={new Date(story.last_updated_at).toLocaleString("zh-CN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            className={variant === "overlay" ? "text-white/80 [&_.text-amber]:text-amber-300" : ""}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ story, variant }: { story: Story; variant: "overlay" | "light" }) {
  const isHot = story.status === "breaking" || story.status === "hot";
  if (!isHot) return null;

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
        story.status === "breaking"
          ? variant === "overlay"
            ? "bg-red-500 text-white"
            : "bg-red-100 text-danger"
          : variant === "overlay"
          ? "bg-amber text-white"
          : "bg-amber/10 text-amber"
      )}
    >
      {formatStoryStatus(story.status)}
    </span>
  );
}
