import { apiClient } from "./client";

export interface AuditLogEntry {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogFilters {
  entity_type?: string;
  action?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogListResponse> {
  const params: Record<string, string | number> = {};
  if (filters.entity_type) params.entity_type = filters.entity_type;
  if (filters.action) params.action = filters.action;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.limit != null) params.limit = filters.limit;
  if (filters.offset != null) params.offset = filters.offset;

  const { data } = await apiClient.get<AuditLogListResponse>("/audit-logs/", {
    params,
  });
  return data;
}

export async function getAuditLog(id: string): Promise<AuditLogEntry> {
  const { data } = await apiClient.get<AuditLogEntry>(`/audit-logs/${id}`);
  return data;
}

export async function listAuditForEntity(
  entityType: string,
  entityId: string
): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get<AuditLogEntry[]>(
    `/audit-logs/for-entity/${entityType}/${entityId}`
  );
  return data;
}
