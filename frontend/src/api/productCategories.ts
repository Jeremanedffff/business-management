import { apiClient } from "./client";

export interface ProductCategory {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  default_tax_rate_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function listCategories(): Promise<ProductCategory[]> {
  const { data } = await apiClient.get<ProductCategory[]>("/product-categories/");
  return data;
}

