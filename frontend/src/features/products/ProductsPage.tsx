import { FormEvent, useEffect, useState } from "react";

import { listCategories, type ProductCategory } from "../../api/productCategories";
import { createProduct, listProducts, type Product } from "../../api/products";
import { listTaxRates, type TaxRate } from "../../api/taxRates";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setProducts(await listProducts());
      setError(null);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Services</h1>
          <p className="text-sm text-gray-500">{products.length} total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
          {showForm ? "Cancel" : "+ New Product"}
        </button>
      </div>

      {showForm && <ProductForm onCreated={() => { setShowForm(false); load(); }} />}

      {error && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>)}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : products.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">No products yet. Create your first one.</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono text-gray-700">{p.code}</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-600 capitalize">{p.item_type}</td>
                  <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-600">{p.unit}</td>
                  <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">{p.selling_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("unit");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [itemType, setItemType] = useState("product");
  const [taxRateId, setTaxRateId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listTaxRates(), listCategories()])
      .then(([t, c]) => {
        setTaxRates(t);
        setCategories(c);
      })
      .catch(() => setError("Failed to load reference data"));
  }, []);

  function onCategoryChange(newCategoryId: string) {
    setCategoryId(newCategoryId);
  }

  function onTaxRateChange(newTaxRateId: string) {
    setTaxRateId(newTaxRateId);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createProduct({
        code,
        name,
        description: description || undefined,
        unit,
        selling_price: sellingPrice,
        cost_price: costPrice,
        tax_rate_id: taxRateId || undefined,
        category_id: categoryId || undefined,
        item_type: itemType,
      });
      onCreated();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">New Product</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Code *" value={code} onChange={setCode} required />
        <Field label="Name *" value={name} onChange={setName} required />
        <Field label="Description" value={description} onChange={setDescription} />
        <Field label="Unit" value={unit} onChange={setUnit} />
        <Field label="Selling Price *" value={sellingPrice} onChange={setSellingPrice} required type="number" />
        <Field label="Cost Price" value={costPrice} onChange={setCostPrice} type="number" />
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="product">Product</option>
            <option value="service">Service</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select value={categoryId} onChange={(e) => onCategoryChange(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">— None —</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            VAT Code *
          </label>
          <select value={taxRateId} onChange={(e) => onTaxRateChange(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">— None —</option>
            {taxRates.map((t) => (<option key={t.id} value={t.id}>{t.code} — {t.name} ({(Number(t.rate) * 100).toFixed(0)}%)</option>))}
          </select>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3">
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300">
          {submitting ? "Creating..." : "Create Product"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

