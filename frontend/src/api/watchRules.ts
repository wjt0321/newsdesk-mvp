import { api } from "./client";
import type { WatchRule, WatchRuleCreate, WatchRuleUpdate, Story } from "./types";

export function listWatchRules() {
  return api.get<WatchRule[]>("/watch-rules").then((res) => res.data);
}

export function createWatchRule(data: WatchRuleCreate) {
  return api.post<WatchRule>("/watch-rules", data).then((res) => res.data);
}

export function getWatchRule(id: number) {
  return api.get<WatchRule>(`/watch-rules/${id}`).then((res) => res.data);
}

export function updateWatchRule(id: number, data: WatchRuleUpdate) {
  return api.patch<WatchRule>(`/watch-rules/${id}`, data).then((res) => res.data);
}

export function deleteWatchRule(id: number) {
  return api.delete(`/watch-rules/${id}`).then((res) => res.data);
}

export function getWatchRuleStories(id: number, limit = 50) {
  return api
    .get<Story[]>(`/watch-rules/${id}/stories`, { params: { limit } })
    .then((res) => res.data);
}
