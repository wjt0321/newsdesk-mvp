import { useState } from "react";
import type { Story } from "../api/types";
import { ImageOff, Aperture } from "lucide-react";
import { displayStoryTitle, formatRelativeTime } from "../lib/format";
import { SourceChips } from "./news/SourceChips";
import { SignalGroup } from "./news/SignalBadge";
import clsx from "clsx";

interface VisualBoardProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export function VisualBoard({ stories, onStoryClick }: VisualBoardProps) {
  if (stories.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
        <ImageOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无视图报道</p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Aperture className="w-4 h-4 text-text-tertiary" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          图片焦点
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stories.map((story) => (
          <VisualCard key={story.id} story={story} onStoryClick={onStoryClick} />
        ))}
      </div>
    </section>
  );
}

interface VisualCardProps {
  story: Story;
  onStoryClick: (story: Story) => void;
}

function VisualCard({ story, onStoryClick }: VisualCardProps) {
  const [fallback, setFallback] = useState(false);
  const coverImage = story.articles.find((article) => article.image_url)?.image_url;
  const hasImage = !!coverImage && !fallback;

  return (
    <article
      onClick={() => onStoryClick(story)}
      className={clsx(
        "group cursor-pointer rounded-xl overflow-hidden border border-border transition-all duration-200 hover:shadow-md hover:border-accent/20 text-left",
        !hasImage && "bg-surface p-4"
      )}
    >
      {hasImage ? (
        <div className="relative aspect-[16/10]">
          <img
            src={coverImage}
            alt={displayStoryTitle(story)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
            onError={() => setFallback(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 p-4 flex flex-col justify-end">
            <VisualContent story={story} variant="overlay" />
          </div>
        </div>
      ) : (
        <VisualContent story={story} variant="light" />
      )}
    </article>
  );
}

function VisualContent({ story, variant }: { story: Story; variant: "overlay" | "light" }) {
  const textPrimary = variant === "overlay" ? "text-white" : "text-text-primary";
  const textSecondary = variant === "overlay" ? "text-white/80" : "text-text-secondary";

  return (
    <div className="space-y-2">
      <h3
        className={clsx(
          "font-semibold leading-snug line-clamp-2 text-balance",
          variant === "overlay" ? "text-base" : "text-sm",
          textPrimary
        )}
      >
        {displayStoryTitle(story)}
      </h3>
      <SourceChips
        names={story.source_names}
        max={3}
        className={variant === "overlay" ? "[&>span]:bg-white/10 [&>span]:border-white/20 [&>span]:text-white/90" : ""}
      />
      <div className={clsx("flex items-center justify-between", textSecondary)}>
        <SignalGroup
          story={story}
          className={variant === "overlay" ? "text-white/80 [&_.text-amber]:text-amber-300" : ""}
        />
        <span className={clsx("text-[11px] tabular-nums", variant === "overlay" ? "text-white/70" : "text-text-tertiary")}>
          {formatRelativeTime(story.last_updated_at)}
        </span>
      </div>
    </div>
  );
}
