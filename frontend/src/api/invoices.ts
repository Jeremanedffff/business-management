import { apiClient } from "./client";

export interface InvoiceItem {
  id: string;
  line_number: number;
  product_id: string | null;
  tax_rate_id: string | null;
  category_id: string | null;
  item_number: string | null;
  description: string;
  unit: string | null;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  line_subtotal: string;
  line_tax: string;
  line_total: string;
  tax_rate_snapshot: string;
  tax_name_snapshot: string | null;
  tax_code_snapshot: string | null;
  is_service: boolean;
  returned_qty?: string;
}

export interface PaymentSummary {
  id: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  verify_token: string | null;
  reference: string | null;
  customer_id: string;
  status_id: string | null;
  currency_id: string;
  customer_name_snapshot: string | null;
  customer_vat_number_snapshot: string | null;
  customer_address_snapshot: string | null;
  customer_tin_snapshot: string | null;
  customer_trading_name_snapshot: string | null;
  seller_tin_snapshot: string | null;
  seller_vat_number_snapshot: string | null;
  seller_name_snapshot: string | null;
  seller_trading_name_snapshot: string | null;
  seller_address_snapshot: string | null;
  issue_date: string;
  issued_at: string | null;
  due_date: string | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  amount_paid: string;
  notes: string | null;
  terms: string | null;
  fiscal_period_id: string | null;
  fiscal_period_name_snapshot: string | null;
  fiscal_period_number: number | null;
  created_by_user_id: string | null;
  created_by_name_snapshot: string | null;
  device_serial_snapshot: string | null;
  device_id_snapshot: string | null;
  items: InvoiceItem[];
  status_code?: string | null;
  status_name?: string | null;
  payments?: PaymentSummary[];
  total_credits?: string;
  total_debits?: string;
}

export interface InvoiceItemCreate {
  product_id?: string;
  tax_rate_id?: string;
  description: string;
  unit?: string;
  quantity: string;
  unit_price: string;
  discount_amount?: string;
}

export interface InvoiceCreate {
  customer_id: string;
  reference?: string;
  notes?: string;
  terms?: string;
  due_date?: string | null;
  items: InvoiceItemCreate[];
}

export interface InvoiceUpdate {
  reference?: string | null;
  notes?: string | null;
  terms?: string | null;
  due_date?: string | null;
  items?: InvoiceItemCreate[];
}

export interface StatusChange {
  status_code: string;
}

export async function listInvoices(): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>("/invoices/");
  return data;
}

export async function searchInvoices(query: string): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>("/invoices/search", {
    params: { q: query },
  });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function createInvoice(payload: InvoiceCreate): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>("/invoices/", payload);
  return data;
}

export async function updateInvoice(id: string, payload: InvoiceUpdate): Promise<Invoice> {
  const { data } = await apiClient.patch<Invoice>(`/invoices/${id}`, payload);
  return data;
}

export async function changeInvoiceStatus(id: string, statusCode: string): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`/invoices/${id}/status`, {
    status_code: statusCode,
  });
  return data;
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`/invoices/${id}/cancel`);
  return data;
}

export async function approveInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`/invoices/${id}/approve`);
  return data;
}
