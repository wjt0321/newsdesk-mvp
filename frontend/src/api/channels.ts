import { api } from "./client";
import type { Channel, Story } from "./types";

export function listChannels() {
  return api.get<Channel[]>("/channels").then((res) => res.data);
}

export function getChannelStories(channelId: string, limit = 50) {
  return api
    .get<Story[]>(`/channels/${channelId}/stories`, { params: { limit } })
    .then((res) => res.data);
}
