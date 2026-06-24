import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listChannels, getChannelStories } from "../api/channels";
import { StoryCard } from "../components/StoryCard";
import { StoryDrawer } from "../components/StoryDrawer";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { Story } from "../api/types";
import { PageEmpty, PageError, PageLoading } from "../components/ui/PageStatus";
import {
  LayoutGrid,
  Newspaper,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: listChannels,
  });
}

function useChannelStories(channelId: string | null) {
  return useQuery({
    queryKey: ["channels", channelId, "stories"],
    queryFn: () => getChannelStories(channelId!, 50),
    enabled: !!channelId,
  });
}

export function ChannelsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const {
    data: channels = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useChannels();

  // Derive selected channel: user pick > first available
  const selectedChannel = channels.find((c) => c.id === selectedId) ?? channels[0] ?? null;

  const {
    data: stories = [],
    isLoading: storiesLoading,
    isError: storiesError,
    refetch: refetchStories,
  } = useChannelStories(selectedChannel?.id ?? null);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
            频道浏览
          </p>
          <h2 className="text-2xl font-semibold">频道</h2>
          <p className="text-sm text-text-secondary mt-1">
            {channels.length} 个频道
          </p>
        </div>
      </div>

      {isLoading ? (
        <PageLoading label="正在加载频道..." />
      ) : isError ? (
        <PageError
          title="加载频道失败"
          description={error instanceof Error ? error.message : "出了点问题，请重试。"}
          onRetry={() => refetch()}
        />
      ) : channels.length === 0 ? (
        <PageEmpty
          icon={LayoutGrid}
          title="暂无频道"
          description="频道由系统根据报道主题自动生成，添加更多来源后这里会出现更多频道。"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <LayoutGrid className="w-4 h-4 text-accent" />
                  频道列表
                </div>
              </div>
              <div className="divide-y divide-border">
                {channels.map((channel) => {
                  const isSelected = selectedChannel?.id === channel.id;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => {
                        setSelectedId(channel.id);
                        setSelectedStory(null);
                      }}
                      className={clsx(
                        "w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between group",
                        isSelected
                          ? "bg-surface-subtle text-accent"
                          : "text-text-primary hover:bg-background/50"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Newspaper className={clsx(
                          "w-4 h-4 flex-shrink-0",
                          isSelected ? "text-accent" : "text-text-tertiary"
                        )} />
                        <span className={clsx(
                          "truncate",
                          isSelected && "font-medium"
                        )}>
                          {channel.name}
                        </span>
                      </div>
                      <ChevronRight className={clsx(
                        "w-3.5 h-3.5 flex-shrink-0 transition-colors",
                        isSelected ? "text-accent" : "text-text-tertiary opacity-0 group-hover:opacity-100"
                      )} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            {storiesLoading ? (
              <PageLoading label="正在加载报道..." />
            ) : storiesError ? (
              <PageError title="加载报道失败" onRetry={() => refetchStories()} />
            ) : stories.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <SectionHeader
                      title={selectedChannel?.name || ""}
                      icon={Newspaper}
                      className="mb-1"
                    />
                    <p className="text-xs text-text-tertiary">
                      {stories.length} 条聚合报道
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {stories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      variant="compact"
                      onClick={() => setSelectedStory(story)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <PageEmpty
                icon={Newspaper}
                title="该频道暂无相关报道"
                description="稍后重试，或切换到其他频道继续浏览。"
              />
            )}
          </div>
        </div>
      )}

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}
