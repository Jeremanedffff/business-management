import { apiClient } from "./client";

// ---------- Types ----------

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  type: string;
  display_name: string;
  details: Record<string, string>;
  is_preferred: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodTypeInfo {
  type: string;
  label: string;
  fields: string[];
}

export interface PaymentMethodCreate {
  type: string;
  display_name: string;
  details: Record<string, string>;
  is_preferred?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface PaymentMethodUpdate {
  display_name?: string;
  details?: Record<string, string>;
  is_preferred?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

// ---------- Admin endpoints ----------

export async function listPaymentMethodTypes(): Promise<PaymentMethodTypeInfo[]> {
  const { data } = await apiClient.get<PaymentMethodTypeInfo[]>("/payment-methods/types");
  return data;
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await apiClient.get<PaymentMethod[]>("/payment-methods/");
  return data;
}

export async function createPaymentMethod(payload: PaymentMethodCreate): Promise<PaymentMethod> {
  const { data } = await apiClient.post<PaymentMethod>("/payment-methods/", payload);
  return data;
}

export async function updatePaymentMethod(
  methodId: string,
  payload: PaymentMethodUpdate,
): Promise<PaymentMethod> {
  const { data } = await apiClient.patch<PaymentMethod>(`/payment-methods/${methodId}`, payload);
  return data;
}

export async function setPreferredPaymentMethod(methodId: string): Promise<PaymentMethod> {
  const { data } = await apiClient.post<PaymentMethod>(`/payment-methods/${methodId}/preferred`);
  return data;
}

export async function deactivatePaymentMethod(methodId: string): Promise<void> {
  await apiClient.delete(`/payment-methods/${methodId}`);
}

// ---------- Any authenticated user ----------

export async function listActivePaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await apiClient.get<PaymentMethod[]>("/payment-methods/active");
  return data;
}