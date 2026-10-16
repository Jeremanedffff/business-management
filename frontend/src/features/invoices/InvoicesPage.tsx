import { PDFDownloadLink } from "@react-pdf/renderer";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { approveInvoice, listInvoices, type Invoice } from "../../api/invoices";
import { InvoiceForm } from "./InvoiceForm";
import { InvoicePDF } from "./InvoicePDF";
import { StatusBadge } from "./StatusBadge";

function extractError(err: unknown, fallback: string): string {
  const axiosError = err as {
    response?: { data?: { error?: { message?: string }; detail?: string } };
  };
  return (
    axiosError.response?.data?.error?.message ||
    axiosError.response?.data?.detail ||
    fallback
  );
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setInvoices(await listInvoices());
      setError(null);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to load invoices"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(inv: Invoice) {
    if (!confirm(`Approve ${inv.invoice_number}? Once approved, it can be sent, printed, and paid.`)) return;
    try {
      await approveInvoice(inv.id);
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to approve invoice"));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">{invoices.length} total</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + New Invoice
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <InvoiceForm
            onCreated={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          No invoices yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Number</th>
                <th className="hidden lg:table-cell px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Ref</th>
                <th className="hidden md:table-cell px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="hidden lg:table-cell px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="py-2.5 pl-4 pr-6 text-right text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Total</th>
                <th className="hidden lg:table-cell py-2.5 pl-4 pr-6 text-right text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Paid</th>
                <th className="hidden md:table-cell py-2.5 pl-4 pr-6 text-right text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Due</th>
                <th className="py-2.5 pl-4 pr-6 text-right text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const outstanding = Number(inv.total) - Number(inv.amount_paid);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 align-middle text-sm font-mono font-medium text-gray-900">
                      {inv.invoice_number}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-2.5 align-middle text-sm text-gray-700">{inv.reference || "-"}</td>
                    <td className="hidden md:table-cell px-4 py-2.5 align-middle text-sm text-gray-700">{inv.issue_date}</td>
                    <td className="hidden lg:table-cell px-4 py-2.5 align-middle text-sm text-gray-700">{inv.due_date || "-"}</td>
                    <td className="px-4 py-2.5 align-middle text-sm text-gray-900">{inv.customer_name_snapshot || "-"}</td>
                    <td className="px-4 py-2.5 align-middle">
                      <StatusBadge code={inv.status_code} name={inv.status_name} amountPaid={inv.amount_paid} total={inv.total} dueDate={inv.due_date} />
                    </td>
                    <td className="py-2.5 pl-4 pr-6 align-middle text-sm text-right font-mono font-semibold text-gray-900 whitespace-nowrap">
                      {Number(inv.total).toFixed(2)}
                    </td>
                    <td className="hidden lg:table-cell py-2.5 pl-4 pr-6 align-middle text-sm text-right font-mono text-gray-700 whitespace-nowrap">{Number(inv.amount_paid).toFixed(2)}</td>
                    <td className="hidden md:table-cell py-2.5 pl-4 pr-6 align-middle text-sm text-right font-mono whitespace-nowrap">
                      {outstanding > 0 ? (
                        <span className="text-red-700">{outstanding.toFixed(2)}</span>
                      ) : (
                        <span className="text-green-700">0.00</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-4 pr-6 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 w-[90px]"
                          title="View invoice details"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </Link>
                        {inv.status_code === "draft" && (
                          <button
                            onClick={() => handleApprove(inv)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 w-[90px]"
                            title="Approve invoice"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </button>
                        )}
                        {inv.status_code !== "draft" && (
                          <PDFDownloadLink
                            document={<InvoicePDF invoice={inv} />}
                          fileName={`${inv.invoice_number}.pdf`}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 w-[90px]"
                          title="Download PDF"
                        >
                          {({ loading: pdfLoading }) => (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              {pdfLoading ? "Preparing" : "Download"}
                            </>
                          )}
                            </PDFDownloadLink>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

