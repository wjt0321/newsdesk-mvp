import type { Story } from "../api/types";
import { StoryCard } from "./StoryCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Newspaper } from "lucide-react";

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
      <SectionHeader title="报道流" icon={Newspaper} />
      <div className="flex flex-col gap-3 overflow-auto">
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
