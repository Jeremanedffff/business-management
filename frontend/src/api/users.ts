import { apiClient } from "./client";

export interface User {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

export interface UserWithRoles extends User {
  role_ids: string[];
  role_names: string[];
}

export interface UserCreateAdmin {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_superuser?: boolean;
}

export interface UserUpdateAdmin {
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export async function listUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/users/");
  return data;
}

export async function listAllUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/users/all");
  return data;
}

export async function createUser(payload: UserCreateAdmin): Promise<User> {
  const { data } = await apiClient.post<User>("/users/", payload);
  return data;
}

export async function getUser(userId: string): Promise<UserWithRoles> {
  const { data } = await apiClient.get<UserWithRoles>(`/users/${userId}`);
  return data;
}

export async function updateUser(userId: string, payload: UserUpdateAdmin): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}`, payload);
  return data;
}

export async function assignRole(userId: string, roleId: string): Promise<void> {
  await apiClient.post(`/users/${userId}/roles`, { role_id: roleId });
}

export async function unassignRole(userId: string, roleId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/roles/${roleId}`);
}

