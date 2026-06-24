import type { Story } from "../api/types";
import { Zap, ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { displayStoryTitle, formatStoryStatus } from "../lib/format";
import { SectionHeader } from "./ui/SectionHeader";

interface RisingNowProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export function RisingNow({ stories, onStoryClick }: RisingNowProps) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader title="正在升温" icon={Zap} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stories.map((story) => (
          <article
            key={story.id}
            onClick={() => onStoryClick(story)}
            className="group cursor-pointer flex items-start gap-3 bg-surface border border-border rounded-xl p-3 transition-all duration-200 hover:shadow-sm hover:border-accent/20"
          >
            <div
              className={clsx(
                "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                story.status === "new"
                  ? "bg-emerald-50 text-emerald-600"
                  : story.status === "developing"
                  ? "bg-accent/10 text-accent"
                  : "bg-amber/10 text-amber"
              )}
            >
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                {displayStoryTitle(story)}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-text-tertiary">
                <span
                  className={clsx(
                    "font-medium",
                    story.status === "new"
                      ? "text-emerald-600"
                      : story.status === "developing"
                      ? "text-accent"
                      : "text-amber"
                  )}
                >
                  {formatStoryStatus(story.status)}
                </span>
                <span>{story.source_count} 来源</span>
                <span className="tabular-nums">{story.heat_score.toFixed(1)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
