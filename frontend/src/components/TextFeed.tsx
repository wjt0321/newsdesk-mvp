import type { Story } from "../api/types";
import { StoryCard } from "./StoryCard";

interface TextFeedProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export function TextFeed({ stories, onStoryClick }: TextFeedProps) {
  if (stories.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm">
        暂无报道
      </div>
    );
  }

  return (
    <section className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          报道流
        </h2>
      </div>
      <div className="flex flex-col gap-2 overflow-auto">
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            variant="compact"
            onClick={() => onStoryClick(story)}
          />
        ))}
      </div>
    </section>
  );
}
