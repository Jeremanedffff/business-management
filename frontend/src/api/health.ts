import { apiClient } from "./client";

export interface HealthResponse {
  status: string;
  app: string;
}

export async function getHealth(): Promise<HealthResponse> {
  // Note: /health is at the root, not under /api/v1
  const base = apiClient.defaults.baseURL || "";
  const root = base.replace("/api/v1", "");
  const response = await apiClient.get<HealthResponse>(`${root}/health`);
  return response.data;
}

