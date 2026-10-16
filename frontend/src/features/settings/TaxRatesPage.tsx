import { FormEvent, useEffect, useState } from "react";

import {
  createTaxRate,
  deactivateTaxRate,
  listTaxRates,
  setDefaultTaxRate,
  updateTaxRate,
  type TaxRate,
  type TaxRateCreate,
  type TaxRateUpdate,
} from "../../api/taxRates";
import {
  listTaxCategories,
  type TaxCategory,
} from "../../api/taxCategories";
import { usePermission } from "../auth/usePermission";
import { TaxTabs } from "./TaxTabs";

const TAX_TYPES = ["VAT", "LEVY", "EXEMPT", "ZERO_RATED"] as const;

export function TaxRatesPage() {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<TaxCategory[]>([]);

  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const canManage = usePermission("setting.manage");

  async function load() {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        listTaxRates(),
        listTaxCategories(),
      ]);
      setRates(data);
      setCategories(cats);
      setError(null);
    } catch {
      setError("Failed to load tax rates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(rate: TaxRate) {
    setEditing(rate);
    setShowForm(true);
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
  }

  async function handleSetDefault(rate: TaxRate) {
    setBusy(true);
    try {
      await setDefaultTaxRate(rate.id);
      await load();
    } catch {
      setError("Failed to set default");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(rate: TaxRate) {
    if (
      !confirm(
        `Deactivate ${rate.code}? It will no longer appear in invoice dropdowns.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deactivateTaxRate(rate.id);
      await load();
    } catch {
      setError("Failed to deactivate");
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate(rate: TaxRate) {
    setBusy(true);
    try {
      await updateTaxRate(rate.id, { is_active: true });
      await load();
    } catch {
      setError("Failed to reactivate");
    } finally {
      setBusy(false);
    }
  }

  function categoryName(id: string | null): string {
    if (!id) return "—";
    return categories.find((c) => c.id === id)?.name || "—";
  }

  return (
    <div>
      <TaxTabs active="rates" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Tax Rates
          </h1>
          <p className="text-sm text-gray-500">
            Manage VAT codes, levies, and other tax rates for your business.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex-shrink-0"
          >
            + New Tax Rate
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : rates.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          No tax rates configured yet. Click &quot;+ New Tax Rate&quot; to add one.
        </div>
      ) : (
        <>
          {/* MOBILE: card list (below md) */}
          <div className="md:hidden space-y-3">
            {rates.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-gray-900">
                      {r.code}
                    </div>
                    <div className="text-sm text-gray-800 mt-0.5">{r.name}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    {r.is_default && (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                        Default
                      </span>
                    )}
                    {r.is_active ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-sm">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="text-gray-900 text-right">{r.tax_type}</dd>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="text-gray-900 text-right truncate">
                    {categoryName(r.category_id)}
                  </dd>
                  <dt className="text-gray-500">Rate</dt>
                  <dd className="text-gray-900 text-right font-mono">
                    {(Number(r.rate) * 100).toFixed(2)}%
                  </dd>
                </dl>

                {canManage && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => openEdit(r)}
                      disabled={busy}
                      className="flex-1 min-w-[80px] px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    {!r.is_default && r.is_active && (
                      <button
                        onClick={() => handleSetDefault(r)}
                        disabled={busy}
                        className="flex-1 min-w-[80px] px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                      >
                        Set default
                      </button>
                    )}
                    {r.is_active ? (
                      <button
                        onClick={() => handleDeactivate(r)}
                        disabled={busy}
                        className="flex-1 min-w-[80px] px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(r)}
                        disabled={busy}
                        className="flex-1 min-w-[80px] px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DESKTOP: table (md and up) */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                      Rate
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                      Default
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rates.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-mono font-medium text-gray-900">
                        {r.code}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {r.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {r.tax_type}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {categoryName(r.category_id)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                        {(Number(r.rate) * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-center">
                        {r.is_default ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            Default
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {r.is_active ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 rounded">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {canManage && (
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => openEdit(r)}
                              disabled={busy}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                            >
                              Edit
                            </button>
                            {!r.is_default && r.is_active && (
                              <button
                                onClick={() => handleSetDefault(r)}
                                disabled={busy}
                                className="text-xs text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
                              >
                                Set default
                              </button>
                            )}
                            {r.is_active ? (
                              <button
                                onClick={() => handleDeactivate(r)}
                                disabled={busy}
                                className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(r)}
                                disabled={busy}
                                className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <TaxRateModal
          existing={editing}
          categories={categories}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            load();
          }}
        />
      )}
    </div>
  );
}

function TaxRateModal({
  existing,
  categories,
  onClose,
  onSaved,
}: {
  existing: TaxRate | null;
  categories: TaxCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = existing !== null;

  const [code, setCode] = useState(existing?.code || "");
  const [name, setName] = useState(existing?.name || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [taxType, setTaxType] = useState(existing?.tax_type || "VAT");
  const [categoryId, setCategoryId] = useState(existing?.category_id || "");
  const [ratePct, setRatePct] = useState(
    existing ? (Number(existing.rate) * 100).toString() : "0"
  );
  const [isDefault, setIsDefault] = useState(existing?.is_default || false);
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const rateDecimal = (Number(ratePct) / 100).toFixed(5);

      if (isEdit && existing) {
        const payload: TaxRateUpdate = {
          name: name.trim(),
          description: description.trim() || undefined,
          rate: rateDecimal,
          tax_type: taxType,
          category_id: categoryId || undefined,
          is_active: isActive,
          is_default: isDefault,
        };
        await updateTaxRate(existing.id, payload);
      } else {
        const payload: TaxRateCreate = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          rate: rateDecimal,
          tax_type: taxType,
          category_id: categoryId || undefined,
          is_default: isDefault,
        };
        await createTaxRate(payload);
      }
      onSaved();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { detail?: string; error?: { message?: string } } };
      };
      setError(
        axiosError.response?.data?.error?.message ||
          axiosError.response?.data?.detail ||
          `Failed to ${isEdit ? "update" : "create"} tax rate`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h3 className="font-semibold text-gray-900">
            {isEdit ? `Edit ${existing.code}` : "New Tax Rate"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-4 overflow-y-auto flex-1"
        >
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Code *
              </label>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. VAT15, TOB_LEVY"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Short uppercase identifier — cannot be changed later.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VAT 15%"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TAX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Rate % *
            </label>
            <input
              type="number"
              step="0.00001"
              min="0"
              max="100"
              required
              value={ratePct}
              onChange={(e) => setRatePct(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter as a percentage. e.g. 15 for 15%.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300"
            />
            Set as the default tax rate
          </label>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Active
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {submitting
                ? "Saving..."
                : isEdit
                ? "Save Changes"
                : "Create Tax Rate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
