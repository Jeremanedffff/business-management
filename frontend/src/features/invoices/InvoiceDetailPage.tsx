import { PDFDownloadLink } from "@react-pdf/renderer";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  listNotesForInvoice,
  type AdjustmentNote,
} from "../../api/adjustmentNotes";
import {
  approveInvoice,
  cancelInvoice,
  changeInvoiceStatus,
  getInvoice,
  type Invoice,
} from "../../api/invoices";
import { formatDateOnly, formatDateTimeSAST } from "../../utils/datetime";
import { listActivePaymentMethods, type PaymentMethod } from "../../api/paymentMethods";
import { getFiscalPeriodStatus, type FiscalPeriodStatusInfo } from "../../api/fiscalPeriods";
import { listPaymentMethods, recordPayment, type PaymentMethodInfo } from "../../api/payments";
import { useCompanySettings } from "../../hooks/useCompanySettings";
import { usePermission } from "../auth/usePermission";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoicePDF } from "./InvoicePDF";
import { PaymentModal } from "./PaymentModal";


export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { company } = useCompanySettings();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [notes, setNotes] = useState<AdjustmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<PaymentMethodInfo[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "",
    payer_phone: "",
    reference: "",
    notes: "",
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [fiscalStatus, setFiscalStatus] = useState<FiscalPeriodStatusInfo | null>(null);

  const canUpdate = usePermission("invoice.update");
  const canDelete = usePermission("invoice.delete");

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setLoadWarning(null);
    try {
      const inv = await getInvoice(invoiceId);
      setInvoice(inv);
      const [invoiceNotes, activeMethods, methodOptions, periodStatus] = await Promise.allSettled([
        listNotesForInvoice(invoiceId),
        listActivePaymentMethods(),
        listPaymentMethods(),
        getFiscalPeriodStatus(),
      ]);
      setNotes(invoiceNotes.status === "fulfilled" ? invoiceNotes.value : []);
      setPaymentMethods(activeMethods.status === "fulfilled" ? activeMethods.value : []);
      setPaymentMethodOptions(methodOptions.status === "fulfilled" ? methodOptions.value : []);
      setFiscalStatus(periodStatus.status === "fulfilled" ? periodStatus.value : null);
      setLoadWarning(
        [invoiceNotes, activeMethods, methodOptions, periodStatus].some((result) => result.status === "rejected")
          ? "Some invoice details or payment options could not be loaded."
          : null,
      );
      setError(null);
    } catch {
      setError("Invoice not found");
      setLoadWarning(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatusChange(newStatus: string) {
    if (!invoice) return;
    setBusy(true);
    try {
      await changeInvoiceStatus(invoice.id, newStatus);
      await load();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to change status");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!invoice) return;
    if (!confirm(`Approve ${invoice.invoice_number}? Once approved, it can be sent, printed, and paid.`)) return;
    setBusy(true);
    try {
      await approveInvoice(invoice.id);
      await load();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to approve invoice");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!invoice) return;
    if (!confirm("Cancel this invoice? This cannot be undone.")) return;
    setBusy(true);
    try {
      await cancelInvoice(invoice.id);
      await load();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to cancel invoice");
    } finally {
      setBusy(false);
    }
  }

  const activeNotes = notes.filter((n) => n.status_code !== "cancelled");
  const credits = activeNotes.filter((n) => n.note_type === "credit").reduce((s, n) => s + Number(n.total), 0);
  const debits = activeNotes.filter((n) => n.note_type === "debit").reduce((s, n) => s + Number(n.total), 0);
  const effectiveTotal = invoice ? Number(invoice.total) - credits + debits : 0;
  const outstanding = invoice ? effectiveTotal - Number(invoice.amount_paid) : 0;
  const statusCode = invoice?.status_code || "draft";
  const selectedPaymentMethod =
    paymentMethodOptions.find((method) => method.code === paymentForm.payment_method) ?? paymentMethodOptions[0];
  const isMobilePaymentMethod = selectedPaymentMethod?.is_mobile_money ?? false;
  const isCancelled = statusCode === "cancelled";
  const isPaid = statusCode === "paid" || outstanding <= 0.005;
  const isDraft = statusCode === "draft";
  const isApproved = statusCode === "approved";
  const isWithinWindow = invoice ? isWithinEditWindow(invoice.issue_date) : false;
  const isUnpaid = Boolean(invoice) && !isCancelled && !isPaid && outstanding > 0;

  useEffect(() => {
    if (!invoice || !isUnpaid) return;

    setPaymentForm((current) => ({
      ...current,
      amount: current.amount ? current.amount : outstanding.toFixed(2),
      payment_method: current.payment_method || paymentMethodOptions[0]?.code || "cash",
    }));
  }, [invoice, isUnpaid, outstanding, paymentMethodOptions]);

  async function handlePaymentSubmit(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;

    setPaymentError(null);

    if (isMobilePaymentMethod && !paymentForm.payer_phone.trim()) {
      setPaymentError("Phone number is required for mobile money");
      return;
    }

    setPaymentSubmitting(true);
    try {
      await recordPayment(invoice.id, {
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date || undefined,
        payment_method: paymentForm.payment_method || "cash",
        payer_phone: paymentForm.payer_phone || undefined,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPaymentForm({
        amount: outstanding.toFixed(2),
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: paymentMethodOptions[0]?.code || "cash",
        payer_phone: "",
        reference: "",
        notes: "",
      });
      await load();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setPaymentError(axiosError.response?.data?.error?.message || "Failed to record payment");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (loading) return <div className="text-gray-500">Loading invoice...</div>;
  if (error || !invoice) {
    return (
      <div>
        <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Back to invoices</Link>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">{error || "Invoice not found"}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Back to invoices
        </Link>
      </div>

      {fiscalStatus && fiscalStatus.status !== "open" && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 flex items-start justify-between gap-4">
          <div>
            <strong>No fiscal period is open.</strong> Invoices issued without an open fiscal period may need review.
          </div>
          <Link
            to="/fiscal-periods"
            className="text-xs font-medium text-amber-900 underline whitespace-nowrap"
          >
            Manage periods →
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}
      {loadWarning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">{loadWarning}</div>
      )}

      {isDraft && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          This invoice is a draft. Approve it to enable PDF download, printing, and payments.
        </div>
      )}

      {isApproved && !isWithinWindow && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
          This invoice is past its 6-month edit window. To change it, issue a credit or debit note.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {canUpdate && (isDraft || (isApproved && isWithinWindow)) && (
            <Link to={`/invoices/${invoice.id}/edit`} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </Link>
          )}
          {canUpdate && isDraft && (
            <button onClick={handleApprove} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Approve Invoice
            </button>
          )}
          {canUpdate && isUnpaid && (
            <button onClick={() => setShowPayment(true)} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-green-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Record Payment
            </button>
          )}
          {!isDraft && (
          <PDFDownloadLink document={<InvoicePDF invoice={invoice} paymentMethods={paymentMethods} />} fileName={`${invoice.invoice_number}.pdf`} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800">
            {({ loading: pdfLoading }) => (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {pdfLoading ? "Preparing..." : "Download PDF"}
              </>
            )}
          </PDFDownloadLink>
          )}
          {!isDraft && (
          <Link to={`/invoices/${invoice.id}/print`} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </Link>
          )}
          {canUpdate && isApproved && Number(invoice.amount_paid) === 0 && isWithinWindow && (
            <button onClick={() => handleStatusChange("draft")} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              Revert to Draft
            </button>
          )}
          {canUpdate && !isCancelled && (
            <Link to={`/adjustment-notes/new?invoice_id=${invoice.id}&type=credit`} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              Credit Note
            </Link>
          )}
          {canUpdate && !isCancelled && (
            <Link to={`/adjustment-notes/new?invoice_id=${invoice.id}&type=debit`} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-purple-700 border border-purple-300 rounded-md hover:bg-purple-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Debit Note
            </Link>
          )}
        </div>
        {canDelete && !isCancelled && Number(invoice.amount_paid) === 0 && (
          <button onClick={handleCancel} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Cancel Invoice
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6 shadow-sm print-invoice">
        <div className="p-4 sm:p-8">
          <InvoiceHeader invoice={invoice} statusCode={invoice.status_code} statusName={invoice.status_name} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <InfoCard
              label="Date & Time"
              value={invoice.issued_at ? formatDateTimeSAST(invoice.issued_at) : formatDateOnly(invoice.issue_date)}
            />
            <InfoCard label="Due Date" value={invoice.due_date ? formatDateOnly(invoice.due_date) : "Upon receipt"} />
            <InfoCard label="Fiscal Period" value={invoice.fiscal_period_name_snapshot ?? "-"} />
            <InfoCard label="Created By" value={invoice.created_by_name_snapshot ?? "-"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Bill To</div>
              <div className="text-base font-semibold text-gray-900">{invoice.customer_name_snapshot || "N/A"}</div>
              {invoice.customer_trading_name_snapshot && (<div className="text-sm text-gray-600 mt-0.5">{invoice.customer_trading_name_snapshot}</div>)}
              {invoice.customer_tin_snapshot && (<div className="text-xs text-gray-600 mt-1 font-mono">TIN: {invoice.customer_tin_snapshot}</div>)}
              {invoice.customer_vat_number_snapshot && (<div className="text-xs text-gray-600 mt-1 font-mono">VAT: {invoice.customer_vat_number_snapshot}</div>)}
              {invoice.customer_address_snapshot && (<div className="text-xs text-gray-600 mt-2 whitespace-pre-line leading-relaxed">{invoice.customer_address_snapshot}</div>)}
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Customer Reference</div>
              <div className="text-base text-gray-900 font-mono">{invoice.reference || "-"}</div>
            </div>
          </div>

          {/* Desktop: table (>= md) */}
          <div className="mt-8 -mx-4 sm:-mx-8 hidden md:block">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">#</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Item #</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Disc</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">VAT</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">VAT Amt</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Svc</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{it.line_number}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700">{it.item_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{it.description}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-700">{Number(it.quantity).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-700">{Number(it.unit_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-700">{Number(it.discount_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{it.tax_code_snapshot || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-700">{Number(it.line_tax).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{it.is_service ? "Y" : ""}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-gray-900">{Number(it.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile: card list (< md) */}
          <div className="mt-8 md:hidden space-y-3">
            {invoice.items.map((it) => (
              <div key={it.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-xs text-gray-400 font-mono mt-0.5 shrink-0">{it.line_number}.</span>
                    <div className="text-sm text-gray-900 break-words">{it.description}</div>
                  </div>
                  <div className="text-sm font-mono font-semibold text-gray-900 shrink-0">
                    {Number(it.line_total).toFixed(2)}
                  </div>
                </div>
                {it.item_number && (
                  <div className="text-[10px] text-gray-500 font-mono mt-1 ml-5">Item: {it.item_number}</div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span><span className="text-gray-400">Qty:</span> <span className="font-mono">{Number(it.quantity).toFixed(2)}</span></span>
                  <span><span className="text-gray-400">×</span> <span className="font-mono">{Number(it.unit_price).toFixed(2)}</span></span>
                  {Number(it.discount_amount) > 0 && (
                    <span><span className="text-gray-400">Disc:</span> <span className="font-mono">{Number(it.discount_amount).toFixed(2)}</span></span>
                  )}
                  {it.tax_code_snapshot && (
                    <span><span className="text-gray-400">VAT:</span> <span className="font-mono">{it.tax_code_snapshot}</span></span>
                  )}
                  {Number(it.line_tax) > 0 && (
                    <span><span className="text-gray-400">VAT Amt:</span> <span className="font-mono">{Number(it.line_tax).toFixed(2)}</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full sm:w-80">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-mono">{Number(invoice.subtotal).toFixed(2)}</span></div>
                {Number(invoice.discount_total) > 0 && (<div className="flex justify-between text-gray-600"><span>Discount</span><span className="font-mono">-{Number(invoice.discount_total).toFixed(2)}</span></div>)}
                <div className="flex justify-between text-gray-600"><span>VAT</span><span className="font-mono">{Number(invoice.tax_total).toFixed(2)}</span></div>
                <div className="flex justify-between pt-3 mt-3 border-t-2 border-gray-900 text-lg font-bold text-gray-900"><span>Invoice Total</span><span className="font-mono">{Number(invoice.total).toFixed(2)}</span></div>
                {credits > 0 && (<div className="flex justify-between text-sm text-blue-700"><span>Credit Notes</span><span className="font-mono">-{credits.toFixed(2)}</span></div>)}
                {debits > 0 && (<div className="flex justify-between text-sm text-purple-700"><span>Debit Notes</span><span className="font-mono">+{debits.toFixed(2)}</span></div>)}
                {(credits > 0 || debits > 0) && (<div className="flex justify-between text-sm font-medium text-gray-900 border-t border-gray-200 pt-2"><span>Adjusted Total</span><span className="font-mono">{effectiveTotal.toFixed(2)}</span></div>)}
              </div>
            </div>
          </div>

          {isUnpaid && paymentMethods.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 mb-3">
                How to Pay
              </div>
              <div className="space-y-4">
                {paymentMethods.map((m) => (
                  <div key={m.id}>
                    <div className="text-sm font-semibold text-gray-900">
                      {m.is_preferred && <span className="mr-1">⭐</span>}
                      {m.display_name}
                    </div>
                    {Object.keys(m.details || {}).length > 0 && (
                      <dl className="text-xs text-gray-700 mt-1 space-y-0.5">
                        {Object.entries(m.details || {}).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-500 capitalize">
                              {key.replace(/_/g, " ")}:
                            </span>{" "}
                            <span className="font-mono">{value || "—"}</span>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-blue-100 text-xs text-gray-700">
                <span className="text-gray-500">Reference:</span>{" "}
                <span className="font-mono font-medium">{invoice.invoice_number}</span>
              </div>
            </div>
          )}

          {isUnpaid && (
            <div className="mt-8 no-print border border-gray-200 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Record payment</h3>
              <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Date paid</span>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, payment_date: event.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Account</span>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, payment_method: event.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {!paymentMethodOptions.length && <option value="cash">Cash</option>}
                    {paymentMethodOptions.map((method) => (
                      <option key={method.code} value={method.code}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Amount paid</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Reference (optional)</span>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {isMobilePaymentMethod && (
                  <div className="md:col-span-4">
                    <label className="block">
                      <span className="block text-xs font-medium text-gray-700 mb-1">Customer phone</span>
                      <input
                        type="tel"
                        required
                        value={paymentForm.payer_phone}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, payer_phone: event.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                )}

                <div className="md:col-span-4 flex items-center justify-between gap-3">
                  {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}
                  <button
                    type="submit"
                    disabled={paymentSubmitting}
                    className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {paymentSubmitting ? "Recording..." : "Record payment"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {(invoice.notes || invoice.terms || company.invoice_terms) && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {invoice.notes && (<div className="p-4 bg-gray-50 rounded-lg border border-gray-100"><div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Notes</div><div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{invoice.notes}</div></div>)}
              {(invoice.terms || company.invoice_terms) && (<div className="p-4 bg-gray-50 rounded-lg border border-gray-100"><div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Terms</div><div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{invoice.terms || company.invoice_terms}</div></div>)}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-400">
            <span>{company.invoice_footer || `${invoice.seller_name_snapshot || "-"} — thank you for your business`}</span>
            <span>{invoice.invoice_number} — {formatDateOnly(invoice.issue_date)}</span>
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6 no-print">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Adjustment Notes</h2>
            <p className="text-xs text-gray-500 mt-0.5">{notes.length} note(s) on this invoice</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Number</th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notes.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono font-medium text-blue-700">
                    <Link to={`/adjustment-notes/${n.id}`} className="hover:underline">{n.note_number}</Link>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {n.note_type === "credit" ? (<span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">Credit</span>) : (<span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded">Debit</span>)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">{n.issue_date}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{n.reason || "-"}</td>
                  <td className="px-6 py-3 text-center">
                    {n.status_code === "cancelled" ? (<span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 rounded line-through">Cancelled</span>) : (<span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded">{n.status_name || "Issued"}</span>)}
                  </td>
                  <td className="px-6 py-3 text-sm text-right font-mono font-semibold text-gray-900">
                    {n.note_type === "credit" ? "-" : "+"} {Number(n.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showPayment && (
        <PaymentModal
          invoiceId={invoice.id}
          outstanding={outstanding.toFixed(2)}
          onClose={() => setShowPayment(false)}
          onRecorded={() => { setShowPayment(false); load(); }}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function isWithinEditWindow(issueDate: string): boolean {
  const issued = new Date(issueDate);
  const today = new Date();
  const sixMonthsLater = new Date(issued);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  return today <= sixMonthsLater;
}
