import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  cancelAdjustmentNote,
  getAdjustmentNote,
  type AdjustmentNote,
} from "../../api/adjustmentNotes";
import { usePermission } from "../auth/usePermission";

export function AdjustmentNoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const [note, setNote] = useState<AdjustmentNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canDelete = usePermission("invoice.delete");

  const load = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const n = await getAdjustmentNote(noteId);
      setNote(n);
      setError(null);
    } catch {
      setError("Adjustment note not found");
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCancel() {
    if (!note) return;
    if (!confirm("Cancel this note? The original invoice will be restored.")) return;
    setBusy(true);
    try {
      await cancelAdjustmentNote(note.id);
      await load();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to cancel note");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error || !note) {
    return (
      <div>
        <Link to="/adjustment-notes" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Back to notes
        </Link>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error || "Note not found"}
        </div>
      </div>
    );
  }

  const isCancelled = note.status_code === "cancelled";
  const isCredit = note.note_type === "credit";
  const docLabel = isCredit ? "Credit Note" : "Debit Note";

  return (
    <div>
      <div className="mb-4">
        <Link to="/adjustment-notes" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Back to notes
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {docLabel} {note.note_number}
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Print
          </button>
          {canDelete && !isCancelled && (
            <button
              onClick={handleCancel}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              Cancel Note
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm print-invoice">
        <div className="p-4 sm:p-8">
          <div className="flex justify-between items-start pb-6 border-b border-gray-200">
            <div>
              <div className="text-xl font-bold text-gray-900">{docLabel}</div>
              <div className="font-mono text-sm text-blue-700 mt-1">{note.note_number}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase">{docLabel} Date</div>
              <div className="text-sm font-semibold text-gray-900">{note.issue_date}</div>
              {isCancelled ? (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 rounded line-through">
                  Cancelled
                </span>
              ) : (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded">
                  {note.status_name || "Issued"}
                </span>
              )}
            </div>
          </div>

          {/* Original Invoice + Customer Reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 mb-2">
                Original Invoice
              </div>
              {note.original_invoice_number_snapshot ? (
                <Link
                  to={`/invoices/${note.invoice_id}`}
                  className="text-base font-mono font-semibold text-blue-800 hover:underline"
                >
                  {note.original_invoice_number_snapshot}
                </Link>
              ) : (
                <span className="text-sm text-gray-500">-</span>
              )}
              {note.original_invoice_date_snapshot && (
                <div className="text-xs text-gray-600 mt-1">
                  Invoice Date: <span className="font-medium">{note.original_invoice_date_snapshot}</span>
                </div>
              )}
            </div>

            <div className="border border-gray-200 bg-gray-50/50 rounded-lg p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Customer Reference
              </div>
              <div className="text-base font-mono text-gray-900">
                {note.customer_reference_snapshot || "-"}
              </div>
            </div>

            <div className="border border-gray-200 bg-gray-50/50 rounded-lg p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Reason
              </div>
              <div className="text-sm text-gray-900">{note.reason || "-"}</div>
            </div>
          </div>

          <div className="overflow-x-auto mt-8"><table className="w-full text-sm border-y border-gray-200 min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                  Description
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Qty</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">
                  Price
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">VAT</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">
                  VAT Amt
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {note.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-xs text-gray-500">{it.line_number}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{it.description}</td>
                  <td className="px-3 py-2 text-sm text-right font-mono">
                    {Number(it.quantity).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono">
                    {Number(it.unit_price).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-gray-600">
                    {it.tax_code_snapshot || "-"}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono">
                    {Number(it.line_tax).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono font-semibold">
                    {Number(it.line_total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="mt-6 flex sm:justify-end">
            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">{Number(note.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT</span>
                <span className="font-mono">{Number(note.tax_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 mt-3 border-t-2 border-gray-900 text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="font-mono">{Number(note.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {note.notes && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Notes
              </div>
              <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                {note.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
