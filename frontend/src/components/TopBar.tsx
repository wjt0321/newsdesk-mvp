import { RefreshCw, Search } from "lucide-react";
import {
  useQuery,
  useQueryClient,
  useIsFetching,
} from "@tanstack/react-query";
import { toast } from "sonner";
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
    toast.info("正在刷新数据...");
    queryClient.refetchQueries({ queryKey: ["stories"] });
    queryClient.refetchQueries({ queryKey: ["sources"] });
    queryClient.refetchQueries({ queryKey: ["source-health"] });
    queryClient.refetchQueries({ queryKey: ["watch-rules"] });
    queryClient.refetchQueries({ queryKey: ["channels"] });
    queryClient.refetchQueries({ queryKey: ["briefing"] });
  }

  const today = new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 flex-shrink-0 gap-4">
      <div className="hidden lg:flex items-center gap-2 text-sm text-text-secondary shrink-0 w-48">
        <span>{today}</span>
      </div>

      <div className="flex-1 flex justify-center max-w-2xl">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索报道、来源或主题..."
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-shadow"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 shrink-0 w-auto lg:w-48">
        <div className="hidden md:inline-flex bg-surface-subtle border border-border rounded-lg p-1">
          {TIME_OPTIONS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setHours(value)}
              className={clsx(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
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
          onClick={handleRefresh}
          className="p-1.5 rounded-md hover:bg-surface-subtle transition-colors text-text-secondary hover:text-text-primary"
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
