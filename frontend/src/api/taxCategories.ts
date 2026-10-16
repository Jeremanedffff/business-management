import { apiClient } from "./client";

export interface TaxCategory {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface TaxCategoryCreate {
  code: string;
  name: string;
  description?: string;
  sort_order?: number;
}

export interface TaxCategoryUpdate {
  name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export async function listTaxCategories(): Promise<TaxCategory[]> {
  const { data } = await apiClient.get<TaxCategory[]>("/tax-categories/");
  return data;
}

export async function getTaxCategory(id: string): Promise<TaxCategory> {
  const { data } = await apiClient.get<TaxCategory>(`/tax-categories/${id}`);
  return data;
}

export async function createTaxCategory(
  payload: TaxCategoryCreate
): Promise<TaxCategory> {
  const { data } = await apiClient.post<TaxCategory>("/tax-categories/", payload);
  return data;
}

export async function updateTaxCategory(
  id: string,
  payload: TaxCategoryUpdate
): Promise<TaxCategory> {
  const { data } = await apiClient.put<TaxCategory>(
    `/tax-categories/${id}`,
    payload
  );
  return data;
}

export async function deactivateTaxCategory(id: string): Promise<void> {
  await apiClient.delete(`/tax-categories/${id}`);
}
