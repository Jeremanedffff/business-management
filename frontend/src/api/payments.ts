import { apiClient } from "./client";

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  payer_phone: string | null;
  reference: string | null;
  notes: string | null;
}

export interface PaymentCreate {
  amount: string;
  payment_date?: string;
  payment_method: string;
  payer_phone?: string;
  reference?: string;
  notes?: string;
}

export interface PaymentMethodInfo {
  code: string;
  label: string;
  is_mobile_money: boolean;
}

export async function listPaymentMethods(): Promise<PaymentMethodInfo[]> {
  const { data } = await apiClient.get<PaymentMethodInfo[]>("/payment-methods");
  return data;
}

export async function listPayments(invoiceId: string): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>(`/invoices/${invoiceId}/payments`);
  return data;
}

export async function recordPayment(
  invoiceId: string,
  payload: PaymentCreate,
): Promise<Payment> {
  const { data } = await apiClient.post<Payment>(
    `/invoices/${invoiceId}/payments`,
    payload,
  );
  return data;
}

export async function deletePayment(paymentId: string): Promise<void> {
  await apiClient.delete(`/payments/${paymentId}`);
}

