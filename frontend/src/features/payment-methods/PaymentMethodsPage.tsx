import { FormEvent, useEffect, useState } from "react";

import {
  createPaymentMethod,
  deactivatePaymentMethod,
  listPaymentMethodTypes,
  listPaymentMethods,
  setPreferredPaymentMethod,
  updatePaymentMethod,
  type PaymentMethod,
  type PaymentMethodTypeInfo,
} from "../../api/paymentMethods";

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

export function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [types, setTypes] = useState<PaymentMethodTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([listPaymentMethods(), listPaymentMethodTypes()]);
      setMethods(m);
      setTypes(t);
      setError(null);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to load payment methods"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMakePreferred(id: string) {
    setBusyId(id);
    try {
      await setPreferredPaymentMethod(id);
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to set preferred"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this payment method? It will stop appearing on invoices.")) return;
    setBusyId(id);
    try {
      await deactivatePaymentMethod(id);
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to deactivate"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(id: string) {
    setBusyId(id);
    try {
      await updatePaymentMethod(id, { is_active: true });
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to reactivate"));
    } finally {
      setBusyId(null);
    }
  }

  function openAdd() {
    setEditingMethod(null);
    setShowForm(true);
  }

  function openEdit(method: PaymentMethod) {
    setEditingMethod(method);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
          <p className="text-sm text-gray-500">
            These methods appear on your invoices so customers know how to pay you.
            Each tenant chooses their own.
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={showForm && !editingMethod}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {showForm && !editingMethod ? "Adding..." : "+ Add Payment Method"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <PaymentMethodForm
          types={types}
          existing={editingMethod}
          onDone={() => {
            setShowForm(false);
            setEditingMethod(null);
            load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingMethod(null);
          }}
        />
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : methods.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
          No payment methods yet. Click <strong>+ Add Payment Method</strong> to set one up.
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => {
            const busy = busyId === m.id;
            return (
              <div
                key={m.id}
                className={`bg-white rounded-lg border p-4 ${
                  m.is_active ? "border-gray-200" : "border-gray-200 opacity-60"
                } ${m.is_preferred ? "ring-1 ring-blue-200" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {m.display_name}
                      </h3>
                      {m.is_preferred && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                          Preferred
                        </span>
                      )}
                      {!m.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          Inactive
                        </span>
                      )}
                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                        {m.type}
                      </span>
                    </div>
                    <dl className="text-sm text-gray-600 space-y-0.5">
                      {Object.entries(m.details || {}).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <dt className="text-gray-500 capitalize">
                            {key.replace(/_/g, " ")}:
                          </dt>
                          <dd className="font-mono">{value || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(m)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    {m.is_active && !m.is_preferred && (
                      <button
                        onClick={() => handleMakePreferred(m.id)}
                        disabled={busy}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
                      >
                        Make preferred
                      </button>
                    )}
                    {m.is_active ? (
                      <button
                        onClick={() => handleDeactivate(m.id)}
                        disabled={busy}
                        className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(m.id)}
                        disabled={busy}
                        className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentMethodForm({
  types,
  existing,
  onDone,
  onCancel,
}: {
  types: PaymentMethodTypeInfo[];
  existing: PaymentMethod | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = existing !== null;

  const [type, setType] = useState(existing?.type || "");
  const [displayName, setDisplayName] = useState(existing?.display_name || "");
  const [isPreferred, setIsPreferred] = useState(existing?.is_preferred || false);
  const [details, setDetails] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (existing) {
      for (const [k, v] of Object.entries(existing.details || {})) {
        initial[k] = String(v ?? "");
      }
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeInfo = types.find((t) => t.type === type);

  function setDetail(key: string, value: string) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isEdit && !type) {
      setError("Please select a payment method type");
      return;
    }
    if (!displayName.trim()) {
      setError("Please enter a display name");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const cleanDetails: Record<string, string> = {};
      if (typeInfo) {
        for (const f of typeInfo.fields) {
          if (details[f]) cleanDetails[f] = details[f];
        }
      }

      if (isEdit && existing) {
        await updatePaymentMethod(existing.id, {
          display_name: displayName,
          details: cleanDetails,
          is_preferred: isPreferred,
        });
      } else {
        await createPaymentMethod({
          type,
          display_name: displayName,
          details: cleanDetails,
          is_preferred: isPreferred,
        });
      }
      onDone();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to save payment method"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">
        {isEdit ? `Edit ${existing?.display_name}` : "Add Payment Method"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {!isEdit && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setDetails({});
              }}
              required
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Select type —</option>
              {types.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Display Name *</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={typeInfo?.label || "e.g. M-Pesa (Vodacom)"}
            required
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {typeInfo && typeInfo.fields.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {typeInfo.fields.map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                {field.replace(/_/g, " ")}
              </label>
              <input
                value={details[field] || ""}
                onChange={(e) => setDetail(field, e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      )}

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isPreferred}
          onChange={(e) => setIsPreferred(e.target.checked)}
          className="rounded border-gray-300"
        />
        Mark as preferred (shown first on invoices)
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300"
        >
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Add method"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}