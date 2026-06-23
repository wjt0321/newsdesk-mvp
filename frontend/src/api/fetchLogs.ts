import { api } from "./client";
import type { FetchLog } from "./types";

export interface FetchLogListParams {
  source_id?: number;
  limit?: number;
}

export function listFetchLogs(params: FetchLogListParams = {}) {
  return api.get<FetchLog[]>("/fetch-logs", { params }).then((res) => res.data);
}
