import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  createAdjustmentNote,
  type AdjustmentNoteItemCreate,
} from "../../api/adjustmentNotes";
import {
  getInvoice,
  searchInvoices,
  type Invoice,
} from "../../api/invoices";
import { listTaxRates, type TaxRate } from "../../api/taxRates";

interface DraftItem {
  key: string;
  invoice_item_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate_id: string;
  is_partial: boolean;
  original_qty: number;
  already_returned: number;
  available_qty: number;
}

export function CreateAdjustmentNotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetInvoiceId = searchParams.get("invoice_id") || "";
  const presetType = (searchParams.get("type") || "credit") as "credit" | "debit";

  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [noteType, setNoteType] = useState<"credit" | "debit">(presetType);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTaxRates().then(setTaxRates).catch(() => setError("Failed to load tax rates"));
  }, []);

  useEffect(() => {
    if (presetInvoiceId) {
      getInvoice(presetInvoiceId)
        .then((inv) => {
          setSelectedInvoice(inv);
          setItems(inv.items.filter((it) => Number(it.quantity) - Number(it.returned_qty || 0) > 0).map((it) => itemToDraft(it.id, it.description, Number(it.quantity), it.unit_price, it.tax_rate_id || "", Number(it.returned_qty || 0))));
        })
        .catch(() => setError("Invoice not found"));
    }
  }, [presetInvoiceId]);

  function itemToDraft(invoiceItemId: string, description: string, qty: number, price: string, taxId: string, returnedQty: number): DraftItem {
    const available = qty - returnedQty;
    return {
      key: crypto.randomUUID(),
      invoice_item_id: invoiceItemId,
      description,
      quantity: available.toString(),
      unit_price: price,
      tax_rate_id: taxId,
      is_partial: false,
      original_qty: qty,
      already_returned: returnedQty,
      available_qty: available,
    };
  }

  function handleInvoiceSelected(inv: Invoice, pickedLines: { id: string; description: string; qty: number; price: string; taxId: string; returnedQty: number }[]) {
    setSelectedInvoice(inv);
    const newItems = pickedLines.map((s) => itemToDraft(s.id, s.description, s.qty, s.price, s.taxId, s.returnedQty));
    setItems((prev) => [...prev, ...newItems]);
    setShowPicker(false);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function togglePartial(key: string, partial: boolean) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;
        if (partial) return { ...it, is_partial: true };
        return { ...it, is_partial: false, quantity: it.available_qty.toString() };
      })
    );
  }

  const lineCalculations = useMemo(() => {
    return items.map((it) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      const lineSub = qty * price;
      const rate = taxRates.find((r) => r.id === it.tax_rate_id)?.rate;
      const rateNum = rate ? Number(rate) : 0;
      const lineTax = lineSub * rateNum;
      const lineTotal = lineSub + lineTax;
      const exceeds = qty > it.available_qty;
      return { lineSub, lineTax, lineTotal, exceeds };
    });
  }, [items, taxRates]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let total = 0;
    for (const c of lineCalculations) {
      subtotal += c.lineSub;
      tax += c.lineTax;
      total += c.lineTotal;
    }
    return { subtotal, tax, total };
  }, [lineCalculations]);

  function validate(): string | null {
    if (!selectedInvoice) return "Please select an invoice";
    if (items.length === 0) return "Add at least one line from the invoice";
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = Number(it.quantity);
      if (!qty || qty <= 0) return "Line " + (i + 1) + ": quantity must be > 0";
      if (qty > it.available_qty) {
        return "Line " + (i + 1) + ": quantity " + qty + " exceeds available " + it.available_qty;
      }
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    if (!selectedInvoice) return;

    setSubmitting(true);
    setError(null);
    try {
      const payloadItems: AdjustmentNoteItemCreate[] = items.map((it) => ({
        invoice_item_id: it.invoice_item_id || undefined,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        tax_rate_id: it.tax_rate_id || undefined,
      }));
      const created = await createAdjustmentNote({
        note_type: noteType,
        invoice_id: selectedInvoice.id,
        issue_date: issueDate || undefined,
        reason: reason || undefined,
        notes: notes || undefined,
        items: payloadItems,
      });
      navigate("/adjustment-notes/" + created.id);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to create note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          New {noteType === "credit" ? "Credit Note" : "Debit Note"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {noteType === "credit"
            ? "Reduce the amount owed on an existing invoice."
            : "Increase the amount owed on an existing invoice."}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note Type *</label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as "credit" | "debit")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="credit">Credit Note (reduce amount owed)</option>
              <option value="debit">Debit Note (increase amount owed)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Original Invoice *
          </label>
          {selectedInvoice ? (
            <div className="border border-blue-200 bg-blue-50/50 rounded-md p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-blue-800">{selectedInvoice.invoice_number}</span>
                  {selectedInvoice.status_name && (
                    <span className="text-xs px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded">
                      {selectedInvoice.status_name}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  <span className="font-medium">{selectedInvoice.customer_name_snapshot || "-"}</span>
                  {selectedInvoice.reference && (
                    <span className="text-gray-500"> - Ref: {selectedInvoice.reference}</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  Invoice Date: {selectedInvoice.issue_date} - Total {Number(selectedInvoice.total).toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedInvoice(null); setItems([]); }}
                className="text-xs text-blue-700 hover:text-blue-900 font-medium"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full px-4 py-3 text-left border border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50/30"
            >
              <span className="text-sm text-gray-600">
                Click to search and select an invoice...
              </span>
            </button>
          )}
        </div>
      </div>

      {selectedInvoice && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Lines to {noteType === "credit" ? "return/adjust" : "add"}
            </h3>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add lines from invoice
            </button>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded">
              No lines added yet. Click "+ Add lines from invoice" above.
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Return Type</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Price</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">VAT</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, idx) => {
                  const calc = lineCalculations[idx];
                  return (
                    <tr key={it.key} className={calc.exceeds ? "bg-red-50" : ""}>
                      <td className="px-2 py-2 text-xs text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <div className="text-sm text-gray-900">{it.description}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Ordered {it.original_qty}, returned {it.already_returned}, available {it.available_qty}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => togglePartial(it.key, false)}
                            className={"px-2 py-1 text-xs rounded " + (!it.is_partial ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                          >
                            Full
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePartial(it.key, true)}
                            className={"px-2 py-1 text-xs rounded " + (it.is_partial ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                          >
                            Partial
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={it.available_qty}
                          disabled={!it.is_partial}
                          value={it.quantity}
                          onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                          className={"w-20 px-2 py-1 text-sm text-right border rounded " + (calc.exceeds ? "border-red-400 bg-red-50" : "border-gray-200")}
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-gray-700">{Number(it.unit_price).toFixed(2)}</td>
                      <td className="px-2 py-2 text-right font-mono text-gray-700">{calc.lineTax.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right font-mono font-semibold text-gray-900">
                        {calc.lineTotal.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(it.key)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          title="Remove from note"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}

          <div className="mt-6 flex sm:justify-end">
            <div className="w-full sm:w-72 bg-slate-50 rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT</span>
                <span className="font-mono">{totals.tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold text-base">
                <span>Note Total</span>
                <span className="font-mono">{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer returned goods"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate("/adjustment-notes")}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !selectedInvoice || items.length === 0}
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300"
        >
          {submitting ? "Creating..." : "Create " + (noteType === "credit" ? "Credit" : "Debit") + " Note"}
        </button>
      </div>

      {showPicker && (
        <InvoicePickerModal
          onClose={() => setShowPicker(false)}
          onConfirm={handleInvoiceSelected}
          currentInvoiceId={selectedInvoice?.id || null}
        />
      )}
    </form>
  );
}

interface PickerProps {
  onClose: () => void;
  onConfirm: (inv: Invoice, lines: { id: string; description: string; qty: number; price: string; taxId: string; returnedQty: number }[]) => void;
  currentInvoiceId: string | null;
}

function InvoicePickerModal({ onClose, onConfirm, currentInvoiceId }: PickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickingInvoice, setPickingInvoice] = useState<Invoice | null>(null);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        if (query.trim().length < 2) {
          setResults([]);
        } else {
          setResults(await searchInvoices(query.trim()));
        }
        setError(null);
      } catch {
        setError("Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function pickInvoice(inv: Invoice) {
    setError(null);
    try {
      const full = await getInvoice(inv.id);
      setPickingInvoice(full);
      const availableIds = full.items
        .filter((it) => Number(it.quantity) - Number(it.returned_qty || 0) > 0)
        .map((it) => it.id);
      setSelectedLines(new Set(availableIds));
    } catch {
      setError("Failed to load invoice details");
    }
  }

  function toggleLine(id: string) {
    const next = new Set(selectedLines);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLines(next);
  }

  function backToSearch() {
    setPickingInvoice(null);
    setSelectedLines(new Set());
    setError(null);
  }

  function confirmLines() {
    if (!pickingInvoice) return;
    const chosen = pickingInvoice.items
      .filter((it) => selectedLines.has(it.id))
      .map((it) => ({
        id: it.id,
        description: it.description,
        qty: Number(it.quantity),
        price: it.unit_price,
        taxId: it.tax_rate_id || "",
        returnedQty: Number(it.returned_qty || 0),
      }))
      .filter((c) => c.qty - c.returnedQty > 0);

    if (chosen.length === 0) {
      setError("Select at least one line");
      return;
    }
    onConfirm(pickingInvoice, chosen);
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">
            {pickingInvoice ? "Select Lines from " + pickingInvoice.invoice_number : "Select Invoice"}
          </h3>
          <button
            type="button"
            onClick={() => (pickingInvoice ? backToSearch() : onClose())}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            x
          </button>
        </div>

        {!pickingInvoice && (
          <>
            <div className="p-4 border-b border-gray-100">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by invoice #, customer, or reference..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Type at least 2 characters.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <p className="p-4 text-sm text-gray-500">Searching...</p>
              ) : error ? (
                <p className="p-4 text-sm text-red-600">{error}</p>
              ) : query.trim().length < 2 ? (
                <p className="p-4 text-sm text-gray-500">Start typing to search for an invoice.</p>
              ) : results.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No invoices found.</p>
              ) : (
                results.map((inv) => {
                  const isCurrent = inv.id === currentInvoiceId;
                  return (
                    <div
                      key={inv.id}
                      onClick={() => pickInvoice(inv)}
                      className={"w-full p-3 rounded border mb-1 cursor-pointer " + (isCurrent ? "bg-blue-100 border-blue-400" : "hover:bg-blue-50 border-transparent hover:border-blue-300")}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-blue-700">{inv.invoice_number}</span>
                            {isCurrent && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded">Selected</span>
                            )}
                            {inv.status_name && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{inv.status_name}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-800 mt-0.5">{inv.customer_name_snapshot || "-"}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {inv.issue_date}
                            {inv.reference ? " - Ref " + inv.reference : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-semibold text-gray-900">{Number(inv.total).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {pickingInvoice && (
          <>
            <div className="flex-1 overflow-y-auto p-2">
              {pickingInvoice.items.map((it) => {
                const returned = Number(it.returned_qty || 0);
                const available = Number(it.quantity) - returned;
                const isAvailable = available > 0;
                const isSelected = selectedLines.has(it.id);
                return (
                  <label
                    key={it.id}
                    className={"flex items-start gap-3 p-3 rounded border mb-1 " + (isAvailable ? (isSelected ? "bg-blue-50 border-blue-300 cursor-pointer" : "border-transparent hover:bg-gray-50 cursor-pointer") : "bg-gray-50 opacity-60 cursor-not-allowed")}
                  >
                    <input
                      type="checkbox"
                      disabled={!isAvailable}
                      checked={isSelected}
                      onChange={() => toggleLine(it.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{it.description}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Ordered {it.quantity} - Available{" "}
                        <span className={isAvailable ? "font-semibold text-green-700" : "text-red-600"}>{available}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold">{Number(it.unit_price).toFixed(2)}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              <div className="text-sm text-gray-600">{selectedLines.size} line(s) selected</div>
              <div className="flex gap-2">
                <button type="button" onClick={backToSearch} className="px-4 py-2 text-sm border rounded">Back to search</button>
                <button type="button" onClick={confirmLines} disabled={selectedLines.size === 0} className="px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:bg-blue-300">Add {selectedLines.size} line(s)</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
