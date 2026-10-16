import { apiClient } from "./client";

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  action: string;
  description: string | null;
}

export interface RoleCreate {
  name: string;
  description?: string;
  permission_ids?: string[];
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>("/roles/");
  return data;
}

export async function listAllPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get<Permission[]>("/roles/permissions");
  return data;
}

export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const { data } = await apiClient.get<Permission[]>(`/roles/${roleId}/permissions`);
  return data;
}

export async function createRole(payload: RoleCreate): Promise<Role> {
  const { data } = await apiClient.post<Role>("/roles/", payload);
  return data;
}

