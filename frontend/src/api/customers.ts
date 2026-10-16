import { apiClient } from "./client";

export interface Customer {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  trading_name: string | null;
  tin: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  customer_type: string;
  is_active: boolean;
}

export interface CustomerCreate {
  name: string;
  trading_name?: string;
  tin?: string;
  vat_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  customer_type?: string;
}

export async function listCustomers(): Promise<Customer[]> {
  const { data } = await apiClient.get<Customer[]>("/customers/");
  return data;
}

export async function createCustomer(payload: CustomerCreate): Promise<Customer> {
  const { data } = await apiClient.post<Customer>("/customers/", payload);
  return data;
}

