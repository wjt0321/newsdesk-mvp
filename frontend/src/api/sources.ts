import { api } from "./client";
import type { Source, SourceCreate, SourceUpdate, FetchLog, SourceHealth } from "./types";

export function listSources() {
  return api.get<Source[]>("/sources").then((res) => res.data);
}

export function createSource(data: SourceCreate) {
  return api.post<Source>("/sources", data).then((res) => res.data);
}

export function fetchSource(id: number) {
  return api.get<Source>(`/sources/${id}`).then((res) => res.data);
}

export function updateSource(id: number, data: SourceUpdate) {
  return api.patch<Source>(`/sources/${id}`, data).then((res) => res.data);
}

export function deleteSource(id: number) {
  return api.delete(`/sources/${id}`).then((res) => res.data);
}

export function triggerFetch(id: number) {
  return api.post<FetchLog>(`/sources/${id}/fetch?background=true`).then((res) => res.data);
}

export function listSourceHealth() {
  return api.get<SourceHealth[]>("/source-health").then((res) => res.data);
}
