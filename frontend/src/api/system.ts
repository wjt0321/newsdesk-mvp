import { api } from "./client";

export async function pauseFetching() {
  const { data } = await api.post("/system/pause");
  return data;
}

export async function resumeFetching() {
  const { data } = await api.post("/system/resume");
  return data;
}

export async function getSystemStatus() {
  const { data } = await api.get("/system/status");
  return data;
}
