import { apiClient } from "./client";

export interface Setting {
  key: string;
  value: string | null;
  description: string | null;
}

export async function listTenantSettings(): Promise<Setting[]> {
  const { data } = await apiClient.get<Setting[]>("/settings/tenant");
  return data;
}

export async function listSystemSettings(): Promise<Setting[]> {
  const { data } = await apiClient.get<Setting[]>("/settings/system");
  return data;
}

export async function updateTenantSetting(key: string, value: string): Promise<Setting> {
  const { data } = await apiClient.put<Setting>(`/settings/tenant/${key}`, { value });
  return data;
}

