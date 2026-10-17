import { PDFDownloadLink } from "@react-pdf/renderer";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  approveInvoice,
  listAllInvoices,
  listInvoices,
  searchInvoices,
  type Invoice,
} from "../../api/invoices";
import { InvoiceForm } from "./InvoiceForm";
import { InvoicePDF } from "./InvoicePDF";
import { StatusBadge } from "./StatusBadge";

const SEARCH_PAGE_SIZE = 20;
const DEFAULT_INVOICE_LIMIT = 20;

function extractError(err: unknown, fallback: string): string {
  const axiosError = err as {
    response?: { data?: { error?: { message?: string }; detail?: string } };
    message?: string;
  };
  return (
    axiosError.response?.data?.error?.message ||
    axiosError.response?.data?.detail ||
    axiosError.message ||
    fallback
  );
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const hasActiveSearch = Boolean(searchTerm.trim());
  const visibleInvoices =
    !hasActiveSearch && !showAllInvoices
      ? invoices.slice(0, DEFAULT_INVOICE_LIMIT)
      : invoices;

  useEffect(() => {
    let active = true;
    const query = searchTerm.trim();
    const timeoutId = window.setTimeout(() => {
      async function load() {
        setLoading(true);
        setError(null);
        try {
          const results = query
            ? await searchInvoices(query, searchOffset, SEARCH_PAGE_SIZE + 1)
            : showAllInvoices
              ? await listAllInvoices()
              : await listInvoices(DEFAULT_INVOICE_LIMIT);
          if (!active) return;
          if (!Array.isArray(results)) {
            throw new Error("The invoice service returned an invalid response.");
          }
          setHasMoreSearchResults(
            Boolean(query) && results.length > SEARCH_PAGE_SIZE,
          );
          setInvoices(
            query ? results.slice(0, SEARCH_PAGE_SIZE) : results,
          );
          setError(null);
        } catch (err: unknown) {
          if (active) {
            setInvoices([]);
            setError(extractError(err, "Failed to load invoices"));
          }
        } finally {
          if (active) setLoading(false);
        }
      }
      void load();
    }, query ? 300 : 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm, searchOffset, refreshKey, showAllInvoices]);

  async function handleApprove(inv: Invoice) {
    if (!confirm(`Approve ${inv.invoice_number}? Once approved, it can be sent, printed, and paid.`)) return;
    try {
      await approveInvoice(inv.id);
      setRefreshKey((key) => key + 1);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to approve invoice"));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">
            {hasActiveSearch
              ? loading
                ? "Searching..."
                : invoices.length
                  ? `Showing ${searchOffset + 1}-${searchOffset + invoices.length} matching invoices`
                  : "0 matching invoices"
              : loading
                  ? "Loading invoices..."
                  : showAllInvoices || invoices.length <= DEFAULT_INVOICE_LIMIT
                    ? `${invoices.length} total`
                    : `Showing ${DEFAULT_INVOICE_LIMIT} of ${invoices.length} invoices`}
          </p>
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
            onCreated={(message) => {
              setShowForm(false);
              if (message) {
                setSearchTerm("");
                setSearchOffset(0);
                setShowAllInvoices(false);
              }
              setRefreshKey((key) => key + 1);
              setNotice(message || null);
            }}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="shrink-0 font-medium underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800"
        >
          {notice}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="invoice-search" className="sr-only">
          Search invoices
        </label>
        <input
          id="invoice-search"
          type="search"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setSearchOffset(0);
            setHasMoreSearchResults(false);
            setShowAllInvoices(false);
            setLoading(true);
          }}
          placeholder="Search by invoice number, customer, or reference"
          className="w-full max-w-lg rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          Could not load invoices. Check your connection and retry.
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          {searchTerm.trim()
            ? "No invoices match your search."
            : "No invoices yet."}
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
              {visibleInvoices.map((inv) => {
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

      {!hasActiveSearch &&
        !loading &&
        invoices.length > DEFAULT_INVOICE_LIMIT && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllInvoices((showAll) => !showAll)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showAllInvoices ? "Show latest 20" : "View all invoices"}
            </button>
          </div>
        )}

      {searchTerm.trim() && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              setSearchOffset((offset) =>
                Math.max(0, offset - SEARCH_PAGE_SIZE),
              )
            }
            disabled={searchOffset === 0 || loading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setSearchOffset((offset) => offset + SEARCH_PAGE_SIZE)}
            disabled={!hasMoreSearchResults || loading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
