import { useQuery } from "@tanstack/react-query";
import { fetchSource as getSource } from "../api/sources";
import { listArticles } from "../api/articles";
import { listFetchLogs } from "../api/fetchLogs";
import { api } from "../api/client";
import type { Story } from "../api/types";

export function useSourceDetail(sourceId: number) {
  return useQuery({
    queryKey: ["source", sourceId],
    queryFn: () => getSource(sourceId),
    enabled: !!sourceId,
  });
}

export function useSourceStories(sourceId: number) {
  return useQuery({
    queryKey: ["stories", "by-source", sourceId],
    queryFn: async () => {
      const { data } = await api.get<Story[]>(`/stories/by-source/${sourceId}`, {
        params: { limit: 50 },
      });
      return data;
    },
    enabled: !!sourceId,
  });
}

export function useSourceArticles(sourceId: number) {
  return useQuery({
    queryKey: ["articles", { source_id: sourceId, limit: 30 }],
    queryFn: () => listArticles({ source_id: sourceId, limit: 30 }),
    enabled: !!sourceId,
  });
}

export function useSourceFetchLogs(sourceId: number) {
  return useQuery({
    queryKey: ["fetch-logs", { source_id: sourceId, limit: 10 }],
    queryFn: () => listFetchLogs({ source_id: sourceId, limit: 10 }),
    enabled: !!sourceId,
  });
}
