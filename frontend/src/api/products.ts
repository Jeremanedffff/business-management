import { apiClient } from "./client";

export interface Product {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  selling_price: string;
  cost_price: string;
  tax_rate_id: string | null;
  category_id: string | null;
  item_type: string;
  track_inventory: boolean;
  is_active: boolean;
}

export interface ProductCreate {
  code?: string;
  name: string;
  description?: string;
  unit?: string;
  selling_price: string;
  cost_price?: string;
  tax_rate_id?: string;
  category_id?: string;
  item_type?: string;
  track_inventory?: boolean;
}

export async function listProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>("/products/");
  return data;
}

export async function createProduct(payload: ProductCreate): Promise<Product> {
  const { data } = await apiClient.post<Product>("/products/", payload);
  return data;
}

