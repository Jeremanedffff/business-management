import { apiClient } from "./client";

// ---------- Types ----------

export interface FiscalPeriod {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  opened_at: string | null;
  opened_by_user_id: string | null;
  closed_at: string | null;
  closed_by_user_id: string | null;
  failure_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FiscalPeriodCreate {
  name: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface FiscalPeriodUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface FiscalPeriodStatusInfo {
  period_id: string | null;
  name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  days_remaining: number | null;
}

// ---------- Admin endpoints ----------

export async function listFiscalPeriods(): Promise<FiscalPeriod[]> {
  const { data } = await apiClient.get<FiscalPeriod[]>("/fiscal-periods/");
  return data;
}

export async function createFiscalPeriod(payload: FiscalPeriodCreate): Promise<FiscalPeriod> {
  const { data } = await apiClient.post<FiscalPeriod>("/fiscal-periods/", payload);
  return data;
}

export async function updateFiscalPeriod(
  periodId: string,
  payload: FiscalPeriodUpdate,
): Promise<FiscalPeriod> {
  const { data } = await apiClient.patch<FiscalPeriod>(`/fiscal-periods/${periodId}`, payload);
  return data;
}

export async function deleteFiscalPeriod(periodId: string): Promise<void> {
  await apiClient.delete(`/fiscal-periods/${periodId}`);
}

export async function openFiscalPeriod(periodId: string): Promise<FiscalPeriod> {
  const { data } = await apiClient.post<FiscalPeriod>(`/fiscal-periods/${periodId}/open`);
  return data;
}

export async function closeFiscalPeriod(periodId: string): Promise<FiscalPeriod> {
  const { data } = await apiClient.post<FiscalPeriod>(`/fiscal-periods/${periodId}/close`);
  return data;
}

// ---------- Any authenticated user ----------

export async function getFiscalPeriodStatus(): Promise<FiscalPeriodStatusInfo> {
  const { data } = await apiClient.get<FiscalPeriodStatusInfo>("/fiscal-periods/status");
  return data;
}