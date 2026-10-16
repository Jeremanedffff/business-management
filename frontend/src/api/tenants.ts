import { apiClient } from "./client";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  trading_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  tin: string | null;
  vat_number: string | null;
  registration_number: string | null;
  business_type: string | null;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  is_active: boolean;
}

export interface TenantCreate {
  name: string;
  slug: string;
  legal_name?: string | null;
  trading_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  tin?: string | null;
  vat_number?: string | null;
  registration_number?: string | null;
  business_type?: string | null;
  industry?: string | null;
  website?: string | null;
  logo_url?: string | null;
}

export interface TenantCreateWithAdmin extends TenantCreate {
  admin_email: string;
  admin_password: string;
  admin_first_name?: string;
  admin_last_name?: string;
}

export interface TenantUpdate {
  name?: string;
  slug?: string;
  legal_name?: string | null;
  trading_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  tin?: string | null;
  vat_number?: string | null;
  registration_number?: string | null;
  business_type?: string | null;
  industry?: string | null;
  website?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
}

export async function listTenants(): Promise<Tenant[]> {
  const response = await apiClient.get<Tenant[]>("/tenants");
  return response.data;
}

export async function createTenant(payload: TenantCreate): Promise<Tenant> {
  const response = await apiClient.post<Tenant>("/tenants", payload);
  return response.data;
}

export async function createTenantWithAdmin(payload: TenantCreateWithAdmin): Promise<Tenant> {
  const response = await apiClient.post<Tenant>("/tenants/with-admin", payload);
  return response.data;
}

export async function getTenant(tenantId: string): Promise<Tenant> {
  const response = await apiClient.get<Tenant>(`/tenants/${tenantId}`);
  return response.data;
}

export async function updateTenant(tenantId: string, payload: TenantUpdate): Promise<Tenant> {
  const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}`, payload);
  return response.data;
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await apiClient.delete(`/tenants/${tenantId}`);
}
