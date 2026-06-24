import { api } from "./client";
import type { Story } from "./types";

export interface StoryListParams {
  limit?: number;
  offset?: number;
  hours?: number;
  q?: string;
}

export function listStories(params: StoryListParams = {}) {
  return api.get<Story[]>("/stories", { params }).then((res) => res.data);
}

export function searchStories(q: string, params: Omit<StoryListParams, "q"> = {}) {
  return listStories({ ...params, q });
}

export function getStory(id: number) {
  return api.get<Story>(`/stories/${id}`).then((res) => res.data);
}

export function listHotStories(limit = 20) {
  return api
    .get<Story[]>("/stories/hot", { params: { limit } })
    .then((res) => res.data);
}
