import { FormEvent, useEffect, useState } from "react";

import {
  createTaxCategory,
  deactivateTaxCategory,
  listTaxCategories,
  updateTaxCategory,
  type TaxCategory,
  type TaxCategoryCreate,
  type TaxCategoryUpdate,
} from "../../api/taxCategories";
import { usePermission } from "../auth/usePermission";
import { TaxTabs } from "./TaxTabs";

export function TaxCategoriesPage() {
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<TaxCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const canManage = usePermission("setting.manage");

  async function load() {
    setLoading(true);
    try {
      const data = await listTaxCategories();
      setCategories(data);
      setError(null);
    } catch {
      setError("Failed to load tax categories");
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

  function openEdit(cat: TaxCategory) {
    setEditing(cat);
    setShowForm(true);
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
  }

  async function handleDeactivate(cat: TaxCategory) {
    if (
      !confirm(
        `Deactivate "${cat.name}"? It will no longer appear in category dropdowns.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deactivateTaxCategory(cat.id);
      await load();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (axiosError.response?.status === 409) {
        setError(
          axiosError.response?.data?.detail ||
            "This category is in use by one or more tax rates."
        );
      } else {
        setError("Failed to deactivate category");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate(cat: TaxCategory) {
    setBusy(true);
    setError(null);
    try {
      await updateTaxCategory(cat.id, { is_active: true });
      await load();
    } catch {
      setError("Failed to reactivate category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TaxTabs active="categories" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Tax Categories
          </h1>
          <p className="text-sm text-gray-500">
            Group tax rates into logical categories.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex-shrink-0"
          >
            + New Category
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
      ) : categories.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          No tax categories yet. Click &quot;+ New Category&quot; to add one.
        </div>
      ) : (
        <>
          {/* MOBILE: card list */}
          <div className="md:hidden space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-gray-900">
                      {cat.code}
                    </div>
                    <div className="text-sm text-gray-800 mt-0.5">
                      {cat.name}
                    </div>
                  </div>
                  {cat.is_active ? (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded flex-shrink-0">
                      Active
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 rounded flex-shrink-0">
                      Inactive
                    </span>
                  )}
                </div>

                {cat.description && (
                  <p className="text-xs text-gray-600 mt-2">
                    {cat.description}
                  </p>
                )}

                {canManage && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => openEdit(cat)}
                      disabled={busy}
                      className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    {cat.is_active ? (
                      <button
                        onClick={() => handleDeactivate(cat)}
                        disabled={busy}
                        className="flex-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(cat)}
                        disabled={busy}
                        className="flex-1 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DESKTOP: table */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Description
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
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-mono font-medium text-gray-900">
                        {cat.code}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {cat.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {cat.description || "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {cat.is_active ? (
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
                              onClick={() => openEdit(cat)}
                              disabled={busy}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                            >
                              Edit
                            </button>
                            {cat.is_active ? (
                              <button
                                onClick={() => handleDeactivate(cat)}
                                disabled={busy}
                                className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(cat)}
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
        <TaxCategoryModal
          existing={editing}
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

function TaxCategoryModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: TaxCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = existing !== null;

  const [code, setCode] = useState(existing?.code || "");
  const [name, setName] = useState(existing?.name || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [sortOrder, setSortOrder] = useState(
    existing?.sort_order?.toString() ?? "0"
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit && existing) {
        const payload: TaxCategoryUpdate = {
          name: name.trim(),
          description: description.trim() || undefined,
          sort_order: Number(sortOrder) || 0,
        };
        await updateTaxCategory(existing.id, payload);
      } else {
        const payload: TaxCategoryCreate = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          sort_order: Number(sortOrder) || 0,
        };
        await createTaxCategory(payload);
      }
      onSaved();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: {
          status?: number;
          data?: { detail?: string; error?: { message?: string } };
        };
      };
      setError(
        axiosError.response?.data?.error?.message ||
          axiosError.response?.data?.detail ||
          `Failed to ${isEdit ? "update" : "create"} category`
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
            {isEdit ? `Edit ${existing.code}` : "New Tax Category"}
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
                placeholder="e.g. STD_VAT, TOBACCO"
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
              placeholder="e.g. Standard VAT"
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
              Sort Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lower numbers appear first.
            </p>
          </div>

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
                : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
