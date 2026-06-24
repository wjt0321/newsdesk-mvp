import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

function parseHours(value: string | null): number | null {
  if (!value || value === "all") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24;
  }

  return parsed;
}

export function useDashboardUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get("q") ?? "";
  const hours = parseHours(searchParams.get("hours"));

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams);

      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setSearchQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      updateParam("q", trimmed || null);
    },
    [updateParam]
  );

  const setHours = useCallback(
    (value: number | null) => {
      updateParam("hours", value === null ? "all" : String(value));
    },
    [updateParam]
  );

  return {
    searchQuery,
    setSearchQuery,
    hours,
    setHours,
  };
}
