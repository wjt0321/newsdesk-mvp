import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listSourceHealth } from "../api/sources";
import {
  displayStoryTitle,
  formatRelativeTime,
} from "../lib/format";
import type { Story } from "../api/types";
import { HeroStory } from "../components/news/HeroStory";
import { SecondaryStory } from "../components/news/SecondaryStory";
import { StoryDrawer } from "../components/StoryDrawer";
import { RisingNow } from "../components/RisingNow";
import { VisualBoard } from "../components/VisualBoard";
import { TextFeed } from "../components/TextFeed";
import { SectionHeader } from "../components/ui/SectionHeader";
import { PageEmpty, PageError, PageLoading } from "../components/ui/PageStatus";
import {
  RotateCcw,
  Newspaper,
  PlusCircle,
  TrendingUp,
  AlertTriangle,
  Aperture,
  FileText,
  Activity,
  Database,
  Layers,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";
import { useRefreshDashboard } from "../hooks/useRefreshDashboard";
import { useTodayStories } from "../hooks/useTodayStories";

export function TodayPage() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const { refreshDashboard } = useRefreshDashboard();

  const {
    heroStory,
    secondaryStories,
    imageStories,
    textStories,
    risingStories,
    pendingReview,
    dominance,
    totalCount,
    isLoading,
    isError,
    error,
  } = useTodayStories();

  if (isLoading) {
    return <PageLoading label="正在加载今日简报..." className="h-64" />;
  }

  if (isError) {
    const isConnectionError =
      error instanceof Error &&
      (error.message.includes("Network Error") || error.message.includes("ERR_CONNECTION_REFUSED"));

    return (
      <div className="p-6">
        <PageError
          className="max-w-2xl mx-auto"
          title="加载今日简报失败"
          description={error instanceof Error ? error.message : "出了点问题，请重试。"}
          onRetry={refreshDashboard}
          hint={
            isConnectionError ? (
              <>
                看起来后端未运行。请使用以下命令启动：{" "}
                <code className="bg-surface-subtle px-1.5 py-0.5 rounded">
                  backend/.venv/Scripts/python -m uvicorn app.main:app
                </code>
              </>
            ) : null
          }
        />
      </div>
    );
  }

  if (totalCount === 0 && !isLoading) {
    return (
      <div className="p-6">
        <PageHeader />
        <div className="max-w-2xl mx-auto mt-6">
          <PageEmpty
            icon={Newspaper}
            title="暂无报道"
            description="添加几个 RSS 来源并运行抓取，即可开始查看简报。如果已有来源，请等待下次定时抓取或手动触发。"
          >
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/sources"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                添加来源
              </Link>
              <button
                type="button"
                onClick={refreshDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface-subtle border border-border text-text-primary rounded-lg hover:bg-surface transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                刷新
              </button>
            </div>
          </PageEmpty>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader count={totalCount} />

      {dominance && (
        <div className="mb-5 bg-amber/5 border border-amber/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{dominance.source}</span>{" "}
            在 Top 20 中占比 {Math.round(dominance.ratio * 100)}%，建议关注来源多样性。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-8">
          {heroStory && (
            <section>
              <SectionHeader title="今日重点" icon={TrendingUp} />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7">
                  <HeroStory story={heroStory} onClick={() => setSelectedStory(heroStory)} />
                </div>
                <div className="lg:col-span-5 flex flex-col gap-3">
                  {secondaryStories.map((story) => (
                    <SecondaryStory
                      key={story.id}
                      story={story}
                      onClick={() => setSelectedStory(story)}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {imageStories.length > 0 && (
            <section>
              <SectionHeader title="有图报道" icon={Aperture} />
              <VisualBoard stories={imageStories} onStoryClick={setSelectedStory} />
            </section>
          )}

          <RisingNow stories={risingStories} onStoryClick={setSelectedStory} />

          {textStories.length > 0 && (
            <section>
              <SectionHeader title="文字情报" icon={FileText} />
              <TextFeed stories={textStories} onStoryClick={setSelectedStory} />
            </section>
          )}
        </div>

        <aside className="xl:col-span-4">
          <IntelligenceRail
            pendingReview={pendingReview}
            onStoryClick={setSelectedStory}
          />
        </aside>
      </div>

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}

function PageHeader({ count }: { count?: number }) {
  const today = new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-6">
      <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
        {today}
      </p>
      <h1 className="text-2xl font-semibold text-text-primary">今日情报</h1>
      {typeof count === "number" && (
        <p className="text-sm text-text-secondary mt-1">
          当前周期内 {count} 条报道
        </p>
      )}
    </div>
  );
}

function IntelligenceRail({
  pendingReview,
  onStoryClick,
}: {
  pendingReview: Story[];
  onStoryClick: (story: Story) => void;
}) {
  const { data: health = [], isLoading } = useQuery({
    queryKey: ["source-health"],
    queryFn: listSourceHealth,
  });

  const enabled = health.filter((h) => h.enabled);
  const healthy = enabled.filter((h) => h.status === "healthy").length;
  const problems = enabled.filter((h) =>
    ["broken", "degraded", "silent", "noisy"].includes(h.status)
  );
  const problemCount = problems.length;
  const totalArticles = health.reduce((sum, h) => sum + h.article_count_24h, 0);
  const totalStories = health.reduce((sum, h) => sum + h.story_count_24h, 0);

  const failing = health
    .filter((h) => h.status === "broken" || h.status === "degraded")
    .slice(0, 4);
  const recent = health
    .filter((h) => h.status === "healthy" && h.last_fetched_at)
    .sort(
      (a, b) =>
        new Date(b.last_fetched_at!).getTime() - new Date(a.last_fetched_at!).getTime()
    )
    .slice(0, 4);

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden sticky top-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Activity className="w-4 h-4 text-accent" />
          情报面板
        </div>
      </div>

      {/* Health Stats */}
      <div className="px-5 py-4 border-b border-border">
        <div className="space-y-2">
          <StatRow
            icon={CheckCircle2}
            label="健康来源"
            value={`${healthy}/${enabled.length}`}
            tone={problemCount > 0 ? "text-amber" : "text-success"}
          />
          <StatRow
            icon={Database}
            label="24h 文章"
            value={totalArticles.toString()}
            tone="text-accent"
          />
          <StatRow
            icon={Layers}
            label="24h 报道"
            value={totalStories.toString()}
            tone="text-text-primary"
          />
        </div>
        {problemCount > 0 && (
          <Link
            to="/source-health"
            className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <AlertTriangle className="w-3 h-3" />
            {problemCount} 个来源需要关注 →
          </Link>
        )}
      </div>

      {/* Source Activity */}
      {!isLoading && (failing.length > 0 || recent.length > 0) && (
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
            来源动态
          </p>
          <div className="space-y-2">
            {failing.map((source) => (
              <Link
                key={source.id}
                to={`/sources/${source.id}`}
                className="flex items-center justify-between text-sm hover:text-accent transition-colors"
              >
                <span className="truncate flex-1">{source.name}</span>
                <span className="text-xs text-red-600 flex-shrink-0 ml-2">
                  {source.suggested_action}
                </span>
              </Link>
            ))}
            {recent.map((source) => (
              <Link
                key={source.id}
                to={`/sources/${source.id}`}
                className="flex items-center justify-between text-sm hover:text-accent transition-colors"
              >
                <span className="truncate flex-1">{source.name}</span>
                <span className="text-xs text-text-tertiary flex-shrink-0 ml-2">
                  {formatRelativeTime(source.last_fetched_at!)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pending Review */}
      {pendingReview.length > 0 && (
        <div className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber" />
            待复核
          </p>
          <div className="space-y-2.5">
            {pendingReview.map((story) => (
              <button
                key={story.id}
                onClick={() => onStoryClick(story)}
                className="w-full text-left group"
              >
                <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-accent transition-colors">
                  {displayStoryTitle(story)}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {story.needs_review ? "需审核" : `置信度 ${(story.confidence * 100).toFixed(0)}%`}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-subtle/50">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Icon className="w-4 h-4 text-text-tertiary" />
        <span>{label}</span>
      </div>
      <span className={clsx("text-sm font-semibold tabular-nums", tone)}>
        {value}
      </span>
    </div>
  );
}
