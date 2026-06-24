import type { Story } from "../api/types";
import { TrendingUp } from "lucide-react";
import { HeroStory } from "./news/HeroStory";
import { SecondaryStory } from "./news/SecondaryStory";
import { SectionHeader } from "./ui/SectionHeader";

interface FocusStripProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export function FocusStrip({ stories, onStoryClick }: FocusStripProps) {
  const heroStory = stories[0] || null;
  const secondaryStories = stories.slice(1, 4);

  if (!heroStory) {
    return null;
  }

  return (
    <section className="mb-6">
      <SectionHeader title="焦点" icon={TrendingUp} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <HeroStory story={heroStory} onClick={() => onStoryClick(heroStory)} />
        </div>
        <div className="lg:col-span-5 flex flex-col gap-3">
          {secondaryStories.map((story) => (
            <SecondaryStory
              key={story.id}
              story={story}
              onClick={() => onStoryClick(story)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
