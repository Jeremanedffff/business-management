import { apiClient } from "./client";

export interface TaxRate {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  rate: string;
  tax_type: string;
  is_active: boolean;
  is_default: boolean;
  category_id: string | null;
}

export interface TaxRateCreate {
  code: string;
  name: string;
  description?: string;
  rate: string;
  tax_type: string;
  is_default?: boolean;
  category_id?: string | null;
}

export interface TaxRateUpdate {
  name?: string;
  description?: string;
  rate?: string;
  tax_type?: string;
  is_active?: boolean;
  is_default?: boolean;
  category_id?: string | null;
}

export async function listTaxRates(): Promise<TaxRate[]> {
  const { data } = await apiClient.get<TaxRate[]>("/tax-rates/");
  return data;
}

export async function getTaxRate(id: string): Promise<TaxRate> {
  const { data } = await apiClient.get<TaxRate>(`/tax-rates/${id}`);
  return data;
}

export async function createTaxRate(payload: TaxRateCreate): Promise<TaxRate> {
  const { data } = await apiClient.post<TaxRate>("/tax-rates/", payload);
  return data;
}

export async function updateTaxRate(
  id: string,
  payload: TaxRateUpdate
): Promise<TaxRate> {
  const { data } = await apiClient.put<TaxRate>(`/tax-rates/${id}`, payload);
  return data;
}

export async function setDefaultTaxRate(id: string): Promise<TaxRate> {
  const { data } = await apiClient.post<TaxRate>(
    `/tax-rates/${id}/set-default`
  );
  return data;
}

export async function deactivateTaxRate(id: string): Promise<void> {
  await apiClient.delete(`/tax-rates/${id}`);
}
