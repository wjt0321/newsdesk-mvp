import { useState } from "react";
import type { Story } from "../api/types";
import { Flame, ImageOff } from "lucide-react";
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
        <p className="text-sm">No visual stories right now</p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Visual Board
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

  return (
    <button
      onClick={() => onStoryClick(story)}
      className="group relative aspect-[16/10] rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all text-left"
    >
      {coverImage && !fallback ? (
        <img
          src={coverImage}
          alt={story.short_title || story.canonical_title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={() => setFallback(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center p-6 text-center">
          <ImageOff className="w-8 h-8 text-text-secondary mb-2" />
          <p className="text-sm font-medium text-text-primary line-clamp-2">
            {story.short_title || story.canonical_title}
          </p>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <h3 className="font-semibold text-white leading-snug line-clamp-2 mb-1.5 drop-shadow-sm">
          {story.short_title || story.canonical_title}
        </h3>
        <div className="flex items-center justify-between text-xs text-white/90">
          <span>{story.source_count} sources</span>
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber" />
            {story.heat_score.toFixed(1)}
          </span>
        </div>
      </div>
      <span
        className={clsx(
          "absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
          story.status === "breaking"
            ? "bg-red-500 text-white"
            : story.status === "hot"
            ? "bg-amber-500 text-white"
            : story.status === "new"
            ? "bg-green-500 text-white"
            : story.status === "developing"
            ? "bg-blue-500 text-white"
            : "bg-white/90 text-text-primary"
        )}
      >
        {story.status}
      </span>
    </button>
  );
}
