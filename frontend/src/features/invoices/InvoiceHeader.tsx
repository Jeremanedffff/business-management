import type { Invoice } from "../../api/invoices";
import { initials } from "../../utils/initials";
import { StatusBadge } from "./StatusBadge";

interface InvoiceHeaderProps {
  invoice: Invoice;
  statusCode?: string | null;
  statusName?: string | null;
}

export function InvoiceHeader({ invoice, statusCode, statusName }: InvoiceHeaderProps) {
  const sellerName = invoice.seller_name_snapshot || "-";
  const sellerTrade = invoice.seller_trading_name_snapshot;
  const sellerTin = invoice.seller_tin_snapshot;
  const sellerVat = invoice.seller_vat_number_snapshot;
  const sellerAddress = invoice.seller_address_snapshot;

  return (
    <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-8 border-b border-gray-200">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="w-20 h-20 rounded-lg bg-brand-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 tracking-tight">
          {initials(sellerName)}
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-brand-700 tracking-tight leading-tight">
            {sellerName}
          </h2>
          {sellerTrade && (
            <div className="text-sm text-gray-600 mt-1">{sellerTrade}</div>
          )}
          <div className="text-xs text-gray-600 mt-3 leading-relaxed">
            {sellerAddress && <div>{sellerAddress}</div>}
            {(sellerTin || sellerVat) && (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-gray-500">
                {sellerTin && (
                  <span>TIN: <span className="font-mono text-gray-700">{sellerTin}</span></span>
                )}
                {sellerVat && (
                  <span>VAT: <span className="font-mono text-gray-700">{sellerVat}</span></span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-left md:text-right flex-shrink-0">
        <h1 className="text-3xl font-bold text-brand-700 tracking-tight uppercase">
          Tax Invoice
        </h1>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-md">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Invoice No.
          </span>
          <span className="font-mono text-sm font-semibold text-brand-800">
            {invoice.invoice_number}
          </span>
        </div>
        <div className="mt-3">
          <StatusBadge code={statusCode} name={statusName} amountPaid={invoice.amount_paid} total={invoice.total} dueDate={invoice.due_date} />
        </div>
      </div>
    </div>
  );
}