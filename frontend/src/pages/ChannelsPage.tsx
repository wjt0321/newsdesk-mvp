import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listChannels, getChannelStories } from "../api/channels";
import { StoryCard } from "../components/StoryCard";
import { StoryDrawer } from "../components/StoryDrawer";
import type { Channel, Story } from "../api/types";
import {
  Loader2,
  AlertCircle,
  RotateCcw,
  LayoutGrid,
  Newspaper,
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

function StoryErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-red-800 mb-1">
        加载报道失败
      </h3>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        重试
      </button>
    </div>
  );
}

export function ChannelsPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const {
    data: channels = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useChannels();

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
          <h2 className="text-2xl font-semibold">频道</h2>
          <p className="text-sm text-text-secondary">
            按主题频道浏览报道
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          正在加载频道...
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-1">
            加载频道失败
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {error instanceof Error ? error.message : "出了点问题，请重试。"}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重试
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <LayoutGrid className="w-4 h-4 text-accent" />
                  频道
                </div>
              </div>
              <div className="divide-y divide-border">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannel(channel);
                      setSelectedStory(null);
                    }}
                    className={clsx(
                      "w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between",
                      selectedChannel?.id === channel.id
                        ? "bg-blue-50 text-accent font-medium"
                        : "text-text-primary hover:bg-background/50"
                    )}
                  >
                    <span>{channel.name}</span>
                    {selectedChannel?.id === channel.id && (
                      <Newspaper className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selectedChannel ? (
              <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
                选择一个频道以查看相关报道。
              </div>
            ) : storiesLoading ? (
              <div className="flex items-center justify-center py-20 text-text-secondary">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                正在加载报道...
              </div>
            ) : storiesError ? (
              <StoryErrorRetry onRetry={() => refetchStories()} />
            ) : stories.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{selectedChannel.name}</h3>
                  <span className="text-sm text-text-secondary">
                    {stories.length} 条报道
                  </span>
                </div>
                {stories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    variant="compact"
                    onClick={() => setSelectedStory(story)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
                该频道暂无相关报道。
              </div>
            )}
          </div>
        </div>
      )}

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}
