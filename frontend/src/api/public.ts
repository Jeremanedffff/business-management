import { apiClient } from "./client";

export interface PublicInvoiceVerifyResponse {
  invoice_number: string;
  issue_date: string;
  total: string;
  currency_code: string;
  status_code: string;
  status_name: string;
  company_name: string | null;
  verified_at: string;
}

export async function verifyInvoice(
  token: string
): Promise<PublicInvoiceVerifyResponse> {
  const { data } = await apiClient.get<PublicInvoiceVerifyResponse>(
    `/public/verify/${token}`
  );
  return data;
}
