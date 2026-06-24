import { RefreshCw, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useDashboardContext } from "../hooks/useDashboardContext";
import { listSources } from "../api/sources";
import { useRefreshDashboard } from "../hooks/useRefreshDashboard";

const TIME_OPTIONS: { label: string; value: number | null }[] = [
  { label: "1h", value: 1 },
  { label: "6h", value: 6 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "全部", value: null },
];

export function TopBar() {
  const { searchQuery, setSearchQuery, hours, setHours } = useDashboardContext();
  const { isRefreshing, lastRefreshAt, refreshDashboard } = useRefreshDashboard();
  const navigate = useNavigate();

  const { data: sources = [] } = useQuery({
    queryKey: ["sources"],
    queryFn: listSources,
  });

  const health = computeSourceHealth(sources);
  const timeScopeLabel =
    TIME_OPTIONS.find((option) => option.value === hours)?.label ?? "24h";
  const lastFetchedAt = sources
    .map((source) => source.last_fetched_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  const statusText = isRefreshing
    ? "刷新中"
    : lastRefreshAt
    ? `刚刷新于 ${lastRefreshAt.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : lastFetchedAt
    ? `最近抓取 ${formatStatusTime(lastFetchedAt)}`
    : "等待首次刷新";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    navigate("/search");
  }

  const today = new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 flex-shrink-0 gap-4">
      <div className="hidden xl:flex flex-col justify-center text-sm text-text-secondary shrink-0 w-52">
        <span>{today}</span>
        <span className="text-[11px] text-text-tertiary">
          当前窗口 {timeScopeLabel} · {statusText}
        </span>
      </div>

      <div className="flex-1 flex justify-center max-w-2xl">
        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索报道、来源或主题..."
            aria-label="搜索报道、来源或主题"
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-shadow"
          />
        </form>
      </div>

      <div className="flex items-center justify-end gap-3 shrink-0 w-auto lg:w-48">
        <div className="hidden md:inline-flex bg-surface-subtle border border-border rounded-lg p-1">
          {TIME_OPTIONS.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              onClick={() => setHours(value)}
              aria-pressed={hours === value}
              className={clsx(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                hours === value
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
          <span className="hidden xl:inline">{health.label}</span>
          <div className={clsx("w-2 h-2 rounded-full", health.dotClass)} />
        </div>

        <button
          type="button"
          onClick={refreshDashboard}
          className="p-1.5 rounded-md hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors text-text-secondary hover:text-text-primary"
          aria-label="刷新"
          title="刷新"
        >
          <RefreshCw className={clsx("w-4 h-4", isRefreshing && "animate-spin")} />
        </button>
      </div>
    </header>
  );
}

const HEALTH_CONFIG = {
  healthy: { label: "来源健康", dotClass: "bg-emerald-500" },
  delayed: { label: "来源延迟", dotClass: "bg-amber-500" },
  failing: { label: "来源故障", dotClass: "bg-danger" },
  paused: { label: "来源暂停", dotClass: "bg-text-tertiary" },
} as const;

type HealthStatus = keyof typeof HEALTH_CONFIG;

function computeSourceHealth(
  sources: import("../api/types").Source[]
): { label: string; dotClass: string; disabledCount?: number } {
  if (sources.length === 0) {
    return HEALTH_CONFIG.paused;
  }

  const enabledSources = sources.filter((s) => s.enabled);
  const disabledCount = sources.length - enabledSources.length;

  if (enabledSources.length === 0) {
    return {
      ...HEALTH_CONFIG.paused,
      label:
        disabledCount === 1
          ? `${HEALTH_CONFIG.paused.label} (1 个已暂停)`
          : `${HEALTH_CONFIG.paused.label} (${disabledCount} 个已暂停)`,
    };
  }

  let status: HealthStatus = "healthy";

  if (enabledSources.some((s) => s.error_count > 0)) {
    status = "failing";
  } else if (
    enabledSources.some(
      (s) =>
        s.last_fetched_at === null ||
        new Date(s.last_fetched_at).getTime() < Date.now() - 2 * 60 * 60 * 1000
    )
  ) {
    status = "delayed";
  }

  const label =
    disabledCount > 0
      ? `${HEALTH_CONFIG[status].label} (${disabledCount} 个已暂停)`
      : HEALTH_CONFIG[status].label;

  return { ...HEALTH_CONFIG[status], label };
}

function formatStatusTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
