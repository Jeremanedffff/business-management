import { useEffect, useState } from "react";

import {
  listAuditLogs,
  type AuditLogEntry,
} from "../../api/auditLogs";

const ENTITY_TYPES = [
  "invoice",
  "payment",
  "customer",
  "product",
  "product_category",
  "tax_rate",
  "tax_category",
  "user",
  "role",
];

const PAGE_SIZE = 50;

export function AuditLogsPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listAuditLogs({
        entity_type: filterEntityType || undefined,
        action: filterAction || undefined,
        date_from: filterFrom ? `${filterFrom}T00:00:00` : undefined,
        date_to: filterTo ? `${filterTo}T23:59:59` : undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setEntries(data.items);
      setTotal(data.total);
      setError(null);
    } catch {
      setError("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, filterEntityType, filterAction, filterFrom, filterTo]);

  function applyFilters() {
    setOffset(0);
    load();
  }

  function clearFilters() {
    setFilterEntityType("");
    setFilterAction("");
    setFilterFrom("");
    setFilterTo("");
    setOffset(0);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500">
          A permanent record of every important action in your business.
        </p>
      </div>

      <div className="mb-4 bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
            <input
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              placeholder="e.g. invoice.created"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          No audit entries match your filters.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Entity</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => {
                    const expanded = expandedId === e.id;
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                          {new Date(e.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-900 whitespace-nowrap">
                          {e.action}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                          {e.entity_type}
                          {e.entity_id && (
                            <span className="text-xs text-gray-400 ml-1">
                              {e.entity_id.slice(0, 8)}...
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                          {e.user_id ? `${e.user_id.slice(0, 8)}...` : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => setExpandedId(expanded ? null : e.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {expanded ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {entries.map((e) => {
                    if (expandedId !== e.id) return null;
                    return (
                      <tr key={e.id + "-details"} className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">Before</p>
                              <pre className="bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                                {e.old_values ? JSON.stringify(e.old_values, null, 2) : "(no prior state)"}
                              </pre>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">After</p>
                              <pre className="bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                                {e.new_values ? JSON.stringify(e.new_values, null, 2) : "(no new state)"}
                              </pre>
                            </div>
                          </div>
                          {e.notes && (
                            <p className="mt-3 text-xs text-gray-600">
                              <span className="font-semibold">Notes:</span> {e.notes}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <p className="text-sm text-gray-500">
              {total} entries · Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
