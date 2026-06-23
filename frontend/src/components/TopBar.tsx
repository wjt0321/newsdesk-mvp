import { RefreshCw, Search } from "lucide-react";
import { useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import clsx from "clsx";
import { useDashboardContext } from "../hooks/useDashboardContext";
import { listSources } from "../api/sources";

const TIME_OPTIONS: { label: string; value: number | null }[] = [
  { label: "1h", value: 1 },
  { label: "6h", value: 6 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "全部", value: null },
];

export function TopBar() {
  const { searchQuery, setSearchQuery, hours, setHours } = useDashboardContext();
  const queryClient = useQueryClient();
  const isFetchingStories = useIsFetching({ queryKey: ["stories"] }) > 0;
  const isFetchingSources = useIsFetching({ queryKey: ["sources"] }) > 0;
  const isFetchingHealth = useIsFetching({ queryKey: ["source-health"] }) > 0;
  const isFetchingRules = useIsFetching({ queryKey: ["watch-rules"] }) > 0;
  const isFetchingChannels = useIsFetching({ queryKey: ["channels"] }) > 0;
  const isFetchingBriefing = useIsFetching({ queryKey: ["briefing"] }) > 0;
  const isFetching =
    isFetchingStories ||
    isFetchingSources ||
    isFetchingHealth ||
    isFetchingRules ||
    isFetchingChannels ||
    isFetchingBriefing;

  const { data: sources = [] } = useQuery({
    queryKey: ["sources"],
    queryFn: listSources,
  });

  const health = computeSourceHealth(sources);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["stories"] });
    queryClient.invalidateQueries({ queryKey: ["sources"] });
    queryClient.invalidateQueries({ queryKey: ["source-health"] });
    queryClient.invalidateQueries({ queryKey: ["watch-rules"] });
    queryClient.invalidateQueries({ queryKey: ["channels"] });
    queryClient.invalidateQueries({ queryKey: ["briefing"] });
  }

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 flex-shrink-0 gap-4">
      <h1 className="text-lg font-semibold tracking-tight shrink-0">NewsDesk</h1>

      <div className="flex-1 flex justify-center max-w-2xl">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索报道..."
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-shadow"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:inline-flex bg-background border border-border rounded-lg p-1">
          {TIME_OPTIONS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setHours(value)}
              className={clsx(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                hours === value
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="hidden sm:inline text-sm text-text-secondary">{health.label}</span>
        <div className={clsx("w-2 h-2 rounded-full", health.dotClass)} />
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md hover:bg-background transition-colors"
          aria-label="刷新"
          title="刷新"
        >
          <RefreshCw className={clsx("w-4 h-4", isFetching && "animate-spin")} />
        </button>
      </div>
    </header>
  );
}

const HEALTH_CONFIG = {
  healthy: { label: "来源健康", dotClass: "bg-green-500" },
  delayed: { label: "来源延迟", dotClass: "bg-amber-500" },
  failing: { label: "来源故障", dotClass: "bg-red-500" },
  paused: { label: "来源暂停", dotClass: "bg-gray-400" },
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
      label: disabledCount === 1
        ? `${HEALTH_CONFIG.paused.label} (1 个已暂停)`
        : `${HEALTH_CONFIG.paused.label} (${disabledCount} 个已暂停)`,
    };
  }

  let status: HealthStatus = "healthy";

  if (enabledSources.some((s) => s.error_count > 0)) {
    status = "failing";
  } else if (
    enabledSources.some(
      (s) => s.last_fetched_at === null || new Date(s.last_fetched_at).getTime() < Date.now() - 2 * 60 * 60 * 1000
    )
  ) {
    status = "delayed";
  }

  const label = disabledCount > 0
    ? `${HEALTH_CONFIG[status].label} (${disabledCount} 个已暂停)`
    : HEALTH_CONFIG[status].label;

  return { ...HEALTH_CONFIG[status], label };
}
