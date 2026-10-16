import { FormEvent, useEffect, useState } from "react";

import {
  closeFiscalPeriod,
  createFiscalPeriod,
  deleteFiscalPeriod,
  listFiscalPeriods,
  openFiscalPeriod,
  updateFiscalPeriod,
  type FiscalPeriod,
  type FiscalPeriodCreate,
} from "../../api/fiscalPeriods";

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

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case "open":
      return { label: "Open", cls: "bg-green-100 text-green-700" };
    case "closed":
      return { label: "Closed", cls: "bg-gray-100 text-gray-600" };
    case "closing":
      return { label: "Closing...", cls: "bg-amber-100 text-amber-700" };
    case "closure_failed":
      return { label: "Closure failed", cls: "bg-red-100 text-red-700" };
    default:
      return { label: "Not opened", cls: "bg-slate-100 text-slate-600" };
  }
}

export function FiscalPeriodsPage() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FiscalPeriod | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setPeriods(await listFiscalPeriods());
      setError(null);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to load fiscal periods"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleOpen(id: string) {
    setBusyId(id);
    try {
      await openFiscalPeriod(id);
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to open period"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleClose(id: string) {
    if (!confirm("Close this fiscal period? You will not be able to reopen it.")) return;
    setBusyId(id);
    try {
      await closeFiscalPeriod(id);
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to close period"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this fiscal period? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await deleteFiscalPeriod(id);
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to delete period"));
    } finally {
      setBusyId(null);
    }
  }

  // Find the current open period for warning purposes
  const openPeriod = periods.find((p) => p.status === "open");
  const daysRemaining = openPeriod
    ? Math.ceil(
        (new Date(openPeriod.end_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const showWarning = daysRemaining !== null && daysRemaining <= 3;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiscal Periods</h1>
          <p className="text-sm text-gray-500">
            Accounting periods for your business. Only one may be open at a time.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          disabled={showForm && !editing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {showForm && !editing ? "Adding..." : "+ New Period"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {showWarning && openPeriod && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <strong>Heads up:</strong> the current open period "{openPeriod.name}" ends in{" "}
          {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} ({openPeriod.end_date}).
        </div>
      )}

      {showForm && (
        <FiscalPeriodForm
          existing={editing}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
            load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
          No fiscal periods yet. Click <strong>+ New Period</strong> to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => {
            const badge = statusBadge(p.status);
            const busy = busyId === p.id;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-lg border p-4 ${
                  p.status === "open" ? "border-green-300" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {p.start_date} — {p.end_date}
                    </div>
                    {p.opened_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        Opened: {new Date(p.opened_at).toLocaleString()}
                      </div>
                    )}
                    {p.closed_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        Closed: {new Date(p.closed_at).toLocaleString()}
                      </div>
                    )}
                    {p.failure_reason && (
                      <div className="text-xs text-red-600 mt-1">
                        Failure: {p.failure_reason}
                      </div>
                    )}
                    {p.notes && (
                      <div className="text-xs text-gray-500 mt-2 whitespace-pre-line">
                        {p.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {p.status === "not_opened" && (
                      <>
                        <button
                          onClick={() => handleOpen(p.id)}
                          disabled={busy}
                          className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => {
                            setEditing(p);
                            setShowForm(true);
                          }}
                          disabled={busy}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={busy}
                          className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {p.status === "open" && (
                      <button
                        onClick={() => handleClose(p.id)}
                        disabled={busy}
                        className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        Close
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

function FiscalPeriodForm({
  existing,
  onDone,
  onCancel,
}: {
  existing: FiscalPeriod | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = existing !== null;

  const [name, setName] = useState(existing?.name || "");
  const [startDate, setStartDate] = useState(existing?.start_date || "");
  const [endDate, setEndDate] = useState(existing?.end_date || "");
  const [singleDay, setSingleDay] = useState(existing ? existing.start_date === existing.end_date : false);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name");
      return;
    }
    if (!startDate || (!singleDay && !endDate)) {
      setError("Please enter both dates");
      return;
    }
    if (!singleDay && endDate < startDate) {
      setError("End date must be on or after start date");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: FiscalPeriodCreate = {
        name: name.trim(),
        start_date: startDate,
        end_date: singleDay ? startDate : endDate,
        notes: notes || undefined,
      };
      if (isEdit && existing) {
        await updateFiscalPeriod(existing.id, payload);
      } else {
        await createFiscalPeriod(payload);
      }
      onDone();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to save fiscal period"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">
        {isEdit ? `Edit ${existing?.name}` : "New Fiscal Period"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. October 2026"
            required
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Start date *</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {!singleDay && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End date *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            id="singleDay"
            type="checkbox"
            checked={singleDay}
            onChange={(e) => setSingleDay(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="singleDay" className="text-sm text-gray-700">Single day</label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300"
        >
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create period"}
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