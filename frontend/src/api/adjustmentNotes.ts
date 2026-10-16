import { apiClient } from "./client";

export interface AdjustmentNoteItem {
  id: string;
  line_number: number;
  invoice_item_id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  line_subtotal: string;
  line_tax: string;
  line_total: string;
  tax_rate_snapshot: string;
  tax_code_snapshot: string | null;
}

export interface AdjustmentNote {
  id: string;
  tenant_id: string;
  note_type: string;
  note_number: string;
  invoice_id: string;
  customer_id: string;
  status_id: string | null;
  issue_date: string;
  original_invoice_number_snapshot?: string | null;
  original_invoice_date_snapshot?: string | null;
  customer_reference_snapshot?: string | null;
  reason: string | null;
  notes: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  items: AdjustmentNoteItem[];
  status_code?: string | null;
  status_name?: string | null;
}

export interface AdjustmentNoteItemCreate {
  invoice_item_id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate_id?: string;
}

export interface AdjustmentNoteCreate {
  note_type: "credit" | "debit";
  invoice_id: string;
  issue_date?: string;
  reason?: string;
  notes?: string;
  items: AdjustmentNoteItemCreate[];
}

export async function listAdjustmentNotes(noteType?: "credit" | "debit"): Promise<AdjustmentNote[]> {
  const params = noteType ? `?note_type=${noteType}` : "";
  const { data } = await apiClient.get<AdjustmentNote[]>(`/adjustment-notes/${params}`);
  return data;
}

export async function listNotesForInvoice(invoiceId: string): Promise<AdjustmentNote[]> {
  const { data } = await apiClient.get<AdjustmentNote[]>(`/adjustment-notes/for-invoice/${invoiceId}`);
  return data;
}

export async function getAdjustmentNote(id: string): Promise<AdjustmentNote> {
  const { data } = await apiClient.get<AdjustmentNote>(`/adjustment-notes/${id}`);
  return data;
}

export async function createAdjustmentNote(payload: AdjustmentNoteCreate): Promise<AdjustmentNote> {
  const { data } = await apiClient.post<AdjustmentNote>("/adjustment-notes/", payload);
  return data;
}

export async function cancelAdjustmentNote(id: string): Promise<AdjustmentNote> {
  const { data } = await apiClient.post<AdjustmentNote>(`/adjustment-notes/${id}/cancel`);
  return data;
}
