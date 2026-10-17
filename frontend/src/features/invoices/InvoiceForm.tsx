import { FormEvent, useEffect, useMemo, useState } from "react";

import { listCustomers, type Customer } from "../../api/customers";
import {
  approveInvoice,
  createInvoice,
  updateInvoice,
  type Invoice,
  type InvoiceItemCreate,
} from "../../api/invoices";
import { listCategories, type ProductCategory } from "../../api/productCategories";
import { listProducts, type Product } from "../../api/products";
import { listTaxRates, type TaxRate } from "../../api/taxRates";

interface DraftItem {
  key: string;
  product_id: string;
  tax_rate_id: string;
  category_id: string;
  item_number: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  is_service: boolean;
}

function newItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    product_id: "",
    tax_rate_id: "",
    category_id: "",
    item_number: "",
    description: "",
    unit: "",
    quantity: "1",
    unit_price: "",
    discount_amount: "0",
    is_service: false,
  };
}

interface InvoiceFormProps {
  onCreated: (notice?: string) => void;
  initialInvoice?: Invoice;
}

function getRequestError(err: unknown, fallback: string): string {
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

export function InvoiceForm({ onCreated, initialInvoice }: InvoiceFormProps) {
  const isEditMode = Boolean(initialInvoice);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const [customerId, setCustomerId] = useState(initialInvoice?.customer_id || "");
  const [reference, setReference] = useState(initialInvoice?.reference || "");
  const [notes, setNotes] = useState(initialInvoice?.notes || "");
  const [terms, setTerms] = useState(initialInvoice?.terms || "");
  const [dueDate, setDueDate] = useState(initialInvoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [items, setItems] = useState<DraftItem[]>(
    initialInvoice
      ? initialInvoice.items.map((it) => ({
          key: crypto.randomUUID(),
          product_id: it.product_id || "",
          tax_rate_id: it.tax_rate_id || "",
          category_id: it.category_id || "",
          item_number: it.item_number || "",
          description: it.description,
          unit: it.unit || "",
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_amount: it.discount_amount,
          is_service: it.is_service,
        }))
      : [newItem()],
  );
  const [showPicker, setShowPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"draft" | "approve">("approve");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listCustomers(), listProducts(), listTaxRates(), listCategories()])
      .then(([c, p, t, cat]) => {
        setCustomers(c);
        setProducts(p);
        setTaxRates(t);
        setCategories(cat);
        if (!initialInvoice && c.length > 0) setCustomerId(c[0].id);
      })
      .catch(() => setError("Failed to load reference data"));
  }, [initialInvoice]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function onCategoryChange(key: string, categoryId: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, category_id: categoryId } : it)));
  }

  function onTaxRateChange(key: string, taxRateId: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, tax_rate_id: taxRateId } : it)));
  }

  function addProductFromPicker(product: Product) {
    const cat = categories.find((c) => c.id === product.category_id);
    const resolvedTax = product.tax_rate_id || cat?.default_tax_rate_id || "";
    setItems((prev) => [...prev, {
      key: crypto.randomUUID(),
      product_id: product.id,
      tax_rate_id: resolvedTax,
      category_id: product.category_id || "",
      item_number: product.code,
      description: product.name,
      unit: product.unit,
      quantity: "1",
      unit_price: product.selling_price,
      discount_amount: "0",
      is_service: product.item_type === "service",
    }]);
    setShowPicker(false);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const lineCalculations = useMemo(() => {
    return items.map((it) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      const grossSubtotal = qty * price;
      let disc = Number(it.discount_amount) || 0;
      if (disc < 0) disc = 0;
      const lineSub = grossSubtotal - disc;
      const rate = taxRates.find((r) => r.id === it.tax_rate_id)?.rate;
      const rateNum = rate ? Number(rate) : 0;
      const lineTax = lineSub * rateNum;
      const lineTotal = lineSub + lineTax;
      return { lineSub, lineTax, lineTotal, cappedDiscount: disc };
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
    if (!customerId) return "Please select a customer";
    if (items.length === 0) return "Add at least one line item";
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.description.trim()) return `Line ${i + 1}: description is required`;
      const qty = Number(it.quantity);
      if (!qty || qty <= 0) return `Line ${i + 1}: quantity must be greater than 0`;
      const price = Number(it.unit_price);
      if (isNaN(price) || price <= 0) return `Line ${i + 1}: unit price must be greater than 0`;
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payloadItems: InvoiceItemCreate[] = items.map((it, idx) => {
        const calc = lineCalculations[idx];
        return {
          product_id: it.product_id || undefined,
          tax_rate_id: it.tax_rate_id || undefined,
          description: it.description.trim(),
          unit: it.unit || undefined,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_amount: calc.cappedDiscount.toFixed(4),
        };
      });

      if (isEditMode && initialInvoice) {
        await updateInvoice(initialInvoice.id, {
          reference: reference || null,
          notes: notes || null,
          terms: terms || null,
          due_date: dueDate || null,
          items: payloadItems,
        });
      } else {
        const created = await createInvoice({
          customer_id: customerId,
          reference: reference || undefined,
          notes: notes || undefined,
          terms: terms || undefined,
          due_date: dueDate || undefined,
          items: payloadItems,
        });
        if (submitMode === "approve") {
          try {
            await approveInvoice(created.id);
          } catch (approvalError: unknown) {
            onCreated(
              `Invoice ${created.invoice_number} was created and saved, but its approval could not be confirmed: ${getRequestError(approvalError, "Approval failed")}`,
            );
            return;
          }
        }
        onCreated(`Invoice ${created.invoice_number} was created successfully.`);
        return;
      }
      onCreated();
    } catch (err: unknown) {
      setError(
        getRequestError(err, `Failed to ${isEditMode ? "update" : "create"} invoice`),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-6 bg-slate-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isEditMode ? `Edit Invoice ${initialInvoice?.invoice_number}` : "Fiscal Tax Invoice"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode ? "Only draft invoices can be edited" : "Draft - number assigned on save"}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {initialInvoice?.issue_date || new Date().toISOString().slice(0, 10)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border-b border-gray-200">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required disabled={isEditMode} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500">
              <option value="">-- Select customer --</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            {isEditMode && (<p className="mt-1 text-xs text-gray-500">Customer cannot be changed on an existing invoice</p>)}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer Reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PO-2026-001" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Terms</label>
            <input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment terms" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Customer VAT Number</label>
            <div className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">{selectedCustomer?.vat_number || "-"}</div>
          </div>

        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
          <button type="button" onClick={() => setShowPicker(true)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Item from Catalog</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Item #</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Description *</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Qty *</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Price *</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Disc</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">VAT Code</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">VAT Amt</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Svc</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it, idx) => {
                const calc = lineCalculations[idx];
                return (
                  <tr key={it.key} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-500 text-xs">{idx + 1}</td>
                    <td className="px-2 py-2"><input value={it.item_number} onChange={(e) => updateItem(it.key, { item_number: e.target.value })} placeholder="Item #" className="w-24 px-2 py-1 text-xs font-mono border border-gray-200 rounded" /></td>
                    <td className="px-2 py-2"><input required value={it.description} onChange={(e) => updateItem(it.key, { description: e.target.value })} placeholder="Description" className="w-48 px-2 py-1 text-sm border border-gray-200 rounded" /></td>
                    <td className="px-2 py-2"><input type="number" step="0.01" min="0.01" required value={it.quantity} onChange={(e) => updateItem(it.key, { quantity: e.target.value })} className="w-16 px-2 py-1 text-sm text-right border border-gray-200 rounded" /></td>
                    <td className="px-2 py-2"><input type="number" step="0.01" min="0.01" required value={it.unit_price} onChange={(e) => updateItem(it.key, { unit_price: e.target.value })} placeholder="0.00" className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded" /></td>
                    <td className="px-2 py-2"><input type="number" step="0.01" min="0" value={it.discount_amount} onChange={(e) => updateItem(it.key, { discount_amount: e.target.value })} className="w-16 px-2 py-1 text-sm text-right border border-gray-200 rounded" /></td>
                    <td className="px-2 py-2"><div className="flex items-center"><select value={it.tax_rate_id} onChange={(e) => onTaxRateChange(it.key, e.target.value)} className="px-2 py-1 text-xs border border-gray-200 rounded"><option value="">None</option>{taxRates.map((t) => (<option key={t.id} value={t.id}>{t.code} - {t.name} ({(Number(t.rate) * 100).toFixed(0)}%)</option>))}</select></div></td>
                    <td className="px-2 py-2 text-right font-mono text-gray-700">{calc.lineTax.toFixed(2)}</td>
                    <td className="px-2 py-2 text-center"><input type="checkbox" checked={it.is_service} onChange={(e) => updateItem(it.key, { is_service: e.target.checked })} className="rounded border-gray-300" /></td>
                    <td className="px-2 py-2"><select value={it.category_id} onChange={(e) => onCategoryChange(it.key, e.target.value)} className="px-2 py-1 text-xs border border-gray-200 rounded"><option value="">-- Select --</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.name}</option>))}</select></td>
                    <td className="px-2 py-2 text-right font-mono font-semibold text-gray-900">{calc.lineTotal.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right"><button type="button" onClick={() => removeItem(it.key)} disabled={items.length === 1} className="text-red-500 hover:text-red-700 text-sm disabled:opacity-30" title="Remove">x</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={() => setItems((prev) => [...prev, newItem()])} className="mt-3 px-3 py-1.5 text-sm border border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-400 hover:text-blue-600">+ Add custom line</button>

        <div className="mt-6 flex sm:justify-end">
          <div className="w-full sm:w-72 bg-slate-50 rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-mono">{totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">VAT</span><span className="font-mono">{totals.tax.toFixed(2)}</span></div>
            <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold text-base"><span>Grand Total</span><span className="font-mono">{totals.total.toFixed(2)}</span></div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={() => onCreated()} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          {isEditMode ? (
            <button type="submit" onClick={() => setSubmitMode("draft")} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300">
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          ) : (
            <>
              <button type="submit" onClick={() => setSubmitMode("draft")} disabled={submitting} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                {submitting && submitMode === "draft" ? "Saving..." : "Save as Draft"}
              </button>
              <button type="submit" onClick={() => setSubmitMode("approve")} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300">
                {submitting && submitMode === "approve" ? "Creating..." : "Create & Approve"}
              </button>
            </>
          )}
        </div>
      </div>

      {showPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Select a product or service</h3>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              {products.length === 0 ? (<p className="p-4 text-sm text-gray-500">No products available.</p>) : (products.map((p) => (
                <button key={p.id} type="button" onClick={() => addProductFromPicker(p)} className="w-full text-left p-3 hover:bg-gray-50 rounded flex justify-between items-center">
                  <div><p className="font-medium text-gray-900">{p.name}</p><p className="text-xs text-gray-500 font-mono">{p.code} · {p.unit} · {p.item_type}</p></div>
                  <p className="font-mono text-sm font-semibold">{p.selling_price}</p>
                </button>
              )))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
