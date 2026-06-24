import { useCallback, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const DASHBOARD_QUERY_KEYS = [
  ["stories"],
  ["sources"],
  ["source-health"],
  ["watch-rules"],
  ["channels"],
  ["briefing"],
] as const;

export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const isRefreshing =
    useIsFetching({
      predicate: (query) =>
        DASHBOARD_QUERY_KEYS.some((key) => {
          const prefix = key[0];
          return query.queryKey[0] === prefix;
        }),
    }) > 0;

  const refreshDashboard = useCallback(async () => {
    toast.info("正在刷新数据...");

    await Promise.all(
      DASHBOARD_QUERY_KEYS.map((queryKey) =>
        queryClient.refetchQueries({
          queryKey,
          type: "active",
        })
      )
    );

    setLastRefreshAt(new Date());
  }, [queryClient]);

  return {
    isRefreshing,
    lastRefreshAt,
    refreshDashboard,
  };
}
