import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";

import { getInvoice, type Invoice } from "../../api/invoices";
import { formatDateOnly, formatDateTimeSAST } from "../../utils/datetime";
import { initials } from "../../utils/initials";
import { listActivePaymentMethods, type PaymentMethod } from "../../api/paymentMethods";

export function InvoicePrintPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUri, setQrDataUri] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (!invoiceId) return;
    Promise.all([
      getInvoice(invoiceId),
      listActivePaymentMethods().catch(() => [] as PaymentMethod[]),

    ])
      .then(([inv, methods]) => {
        setInvoice(inv);
        setPaymentMethods(methods);
        setError(null);
      })
      .catch(() => setError("Invoice not found"))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  useEffect(() => {
    const verifiable =
      invoice?.status_code === "approved" || invoice?.status_code === "paid";
    if (!verifiable || !invoice?.verify_token) {
      setQrDataUri(null);
      return;
    }
    const base =
      import.meta.env.VITE_VERIFY_BASE_URL || "http://localhost:5173/verify";
    const url = `${base}/${invoice.verify_token}`;
    QRCode.toDataURL(url, { width: 240, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrDataUri)
      .catch(() => setQrDataUri(null));
  }, [invoice?.status_code, invoice?.verify_token]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading invoice...</div>;
  if (error || !invoice) return <div className="p-8 text-center text-red-600">{error}</div>;


  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white print:py-0">
      {/* Toolbar - hidden on print */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 px-4 flex justify-between items-center">
        <Link to={`/invoices/${invoice.id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          ← Back to invoice
        </Link>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Printable invoice */}
      <div className="print-preview print-invoice">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-blue-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 tracking-tight">
              {initials(invoice.seller_name_snapshot || "-")}
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-blue-900 leading-tight">
                {invoice.seller_name_snapshot || "-"}
              </div>
              {invoice.seller_trading_name_snapshot && (
                <div className="text-sm text-gray-700 mt-1">
                  {invoice.seller_trading_name_snapshot}
                </div>
              )}
              <div className="text-xs text-gray-600 mt-3 leading-relaxed">
                {invoice.seller_tin_snapshot && <div>TIN: {invoice.seller_tin_snapshot}</div>}
                {invoice.seller_vat_number_snapshot && <div>VAT: {invoice.seller_vat_number_snapshot}</div>}
                {invoice.seller_address_snapshot && <div>{invoice.seller_address_snapshot}</div>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">FISCAL TAX INVOICE</div>
            <div className="font-mono text-lg font-bold text-gray-900 mt-1">{invoice.invoice_number}</div>
            {invoice.status_code && (
              <div className="inline-block mt-2 px-3 py-1 text-xs font-semibold uppercase rounded bg-gray-100 text-gray-700">
                {invoice.status_name || invoice.status_code}
              </div>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <InfoBox
            label="Date & Time"
            value={invoice.issued_at ? formatDateTimeSAST(invoice.issued_at) : formatDateOnly(invoice.issue_date)}
          />
          <InfoBox
            label="Due Date"
            value={invoice.due_date ? formatDateOnly(invoice.due_date) : "Upon receipt"}
          />
          <InfoBox label="Fiscal Period" value={invoice.fiscal_period_name_snapshot ?? "-"} />
          <InfoBox label="Created By" value={invoice.created_by_name_snapshot ?? "-"} />
        </div>

        {/* Customer + Reference */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="border border-gray-200 rounded p-3">
            <div className="text-[10px] uppercase text-gray-500 tracking-wide mb-1">Bill To</div>
            <div className="text-sm font-medium text-gray-900">{invoice.customer_name_snapshot || "N/A"}</div>
            {invoice.customer_trading_name_snapshot && (
              <div className="text-xs text-gray-700 mt-0.5">{invoice.customer_trading_name_snapshot}</div>
            )}
            {invoice.customer_tin_snapshot && (
              <div className="text-xs text-gray-600 mt-1 font-mono">TIN: {invoice.customer_tin_snapshot}</div>
            )}
            {invoice.customer_vat_number_snapshot && (
              <div className="text-xs text-gray-600 mt-1 font-mono">VAT: {invoice.customer_vat_number_snapshot}</div>
            )}
            {invoice.customer_address_snapshot && (
              <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">{invoice.customer_address_snapshot}</div>
            )}
          </div>
          <div className="border border-gray-200 rounded p-3">
            <div className="text-[10px] uppercase text-gray-500 tracking-wide mb-1">Customer Reference</div>
            <div className="text-sm text-gray-900 font-mono">{invoice.reference || "N/A"}</div>
          </div>
        </div>

        {/* Line items table */}
        <table className="w-full text-sm border-collapse mb-3">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="px-2 py-1.5 text-left text-[10px] uppercase font-semibold text-gray-600 w-8">#</th>
              <th className="px-2 py-1.5 text-left text-[10px] uppercase font-semibold text-gray-600 w-20">Item #</th>
              <th className="px-2 py-1.5 text-left text-[10px] uppercase font-semibold text-gray-600">Description</th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase font-semibold text-gray-600 w-12">Qty</th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase font-semibold text-gray-600 w-16">Price</th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase font-semibold text-gray-600 w-14">Disc</th>
              <th className="px-2 py-1.5 text-left text-[10px] uppercase font-semibold text-gray-600 w-16">VAT</th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase font-semibold text-gray-600 w-16">VAT Amt</th>
              <th className="px-2 py-1.5 text-center text-[10px] uppercase font-semibold text-gray-600 w-8">Svc</th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase font-semibold text-gray-600 w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} className="border-b border-gray-100">
                <td className="px-2 py-1.5 text-xs text-gray-500">{it.line_number}</td>
                <td className="px-2 py-1.5 text-xs font-mono text-gray-700">{it.item_number || "-"}</td>
                <td className="px-2 py-1.5 text-xs text-gray-900">{it.description}</td>
                <td className="px-2 py-1.5 text-xs text-right font-mono">{Number(it.quantity).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-xs text-right font-mono">{Number(it.unit_price).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-xs text-right font-mono">{Number(it.discount_amount).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-xs font-mono text-gray-600">{it.tax_code_snapshot || "-"}</td>
                <td className="px-2 py-1.5 text-xs text-right font-mono">{Number(it.line_tax).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-xs text-center">{it.is_service ? "Y" : ""}</td>
                <td className="px-2 py-1.5 text-xs text-right font-mono font-semibold">{Number(it.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-mono">{Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">VAT</span>
              <span className="font-mono">{Number(invoice.tax_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-gray-900 font-bold text-base">
              <span>Invoice Total</span>
              <span className="font-mono">{Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* How to Pay */}
        {paymentMethods.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-[10px] uppercase text-gray-500 tracking-wide mb-2">How to Pay</div>
            <div className="space-y-3">
              {paymentMethods.map((m) => (
                <div key={m.id}>
                  <div className="text-xs font-semibold text-gray-900">
                    {m.is_preferred && <span className="mr-1">⭐</span>}
                    {m.display_name}
                  </div>
                  {Object.keys(m.details || {}).length > 0 && (
                    <div className="text-[10px] text-gray-600 mt-0.5 space-y-0.5">
                      {Object.entries(m.details || {}).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-400 capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                          <span className="font-mono">{value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-600">
              <span className="text-gray-400">Reference:</span>{" "}
              <span className="font-mono">{invoice.invoice_number}</span>
            </div>
          </div>
        )}
                {/* QR code */}
        {(invoice.status_code === "approved" || invoice.status_code === "paid") && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded">
              {qrDataUri ? (
                <img src={qrDataUri} alt="Invoice verification QR code" className="w-16 h-16 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 bg-white border border-gray-300 flex items-center justify-center text-[8px] text-gray-500 text-center leading-tight flex-shrink-0">
                  QR<br />loading...
                </div>
              )}
              <div className="flex-1 text-xs text-gray-700">
                <div className="font-semibold text-gray-900">Scan to verify this invoice</div>
                <div className="mt-0.5 text-gray-600">
                  This QR code links to a public verification page confirming the invoice details. It is not yet an RSL fiscal receipt.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes / Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
            {invoice.notes && (
              <div>
                <div className="text-[10px] uppercase text-gray-500 tracking-wide mb-1">Notes</div>
                <div className="text-xs text-gray-700 whitespace-pre-line">{invoice.notes}</div>
              </div>
            )}
            {invoice.terms && (
              <div>
                <div className="text-[10px] uppercase text-gray-500 tracking-wide mb-1">Terms</div>
                <div className="text-xs text-gray-700 whitespace-pre-line">{invoice.terms}</div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-gray-200 flex justify-between text-[10px] text-gray-400">
          <span>{(invoice.seller_name_snapshot || "-")} — Generated by MalutiRecon</span>
          <span>{invoice.invoice_number} — {formatDateOnly(invoice.issue_date)}</span>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded p-2">
      <div className="text-[9px] uppercase text-gray-500 tracking-wide">{label}</div>
      <div className="text-xs text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}

