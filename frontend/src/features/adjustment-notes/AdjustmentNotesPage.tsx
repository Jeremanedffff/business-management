import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  listAdjustmentNotes,
  type AdjustmentNote,
} from "../../api/adjustmentNotes";
import { usePermission } from "../auth/usePermission";

type Filter = "all" | "credit" | "debit";

export function AdjustmentNotesPage() {
  const [notes, setNotes] = useState<AdjustmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlType = searchParams.get("note_type") as Filter | null;
  const [filter, setFilter] = useState<Filter>(
    urlType === "credit" || urlType === "debit" ? urlType : "all"
  );

  const canCreate = usePermission("invoice.create");

  const pageTitle =
    filter === "all"
      ? "Credit & Debit Notes"
      : filter === "credit"
      ? "Credit Notes"
      : "Debit Notes";

  const newNoteLabel =
    filter === "all"
      ? "+ New Note"
      : filter === "credit"
      ? "+ New Credit Note"
      : "+ New Debit Note";

  const newNoteHref =
    filter === "all"
      ? "/adjustment-notes/new"
      : `/adjustment-notes/new?type=${filter}`;

  const isFiltered = filter === "credit" || filter === "debit";

  useEffect(() => {
    let cancelled = false;
    async function fetchNotes() {
      setLoading(true);
      setError(null);
      try {
        const type = filter === "all" ? undefined : filter;
        const data = await listAdjustmentNotes(type);
        if (!cancelled) setNotes(data);
      } catch {
        if (!cancelled) setError("Failed to load adjustment notes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchNotes();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  function changeFilter(next: Filter) {
    setFilter(next);
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("note_type");
    else params.set("note_type", next);
    setSearchParams(params, { replace: true });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500">
            {notes.length} {filter === "all" ? "total" : filter + " notes"}
            {isFiltered && (
              <>
                {" · "}
                <Link
                  to="/adjustment-notes"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all notes →</Link>
              </>
            )}
          </p>
        </div>
        {canCreate && (
          <Link
            to={newNoteHref}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            {newNoteLabel}
          </Link>
        )}
      </div>

      {!isFiltered && (
        <div className="mb-4 flex gap-1 border-b border-gray-200">
          {(["all", "credit", "debit"] as const).map((f) => (
            <button
              key={f}
              onClick={() => changeFilter(f)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                filter === f
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {f === "all" ? "All" : f === "credit" ? "Credit Notes" : "Debit Notes"}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          No {filter === "all" ? "" : filter + " "}notes yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Number</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notes.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono font-medium text-blue-700">
                    <Link to={`/adjustment-notes/${n.id}`} className="hover:underline">
                      {n.note_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {n.note_type === "credit" ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">Credit</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded">Debit</span>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-700">{n.issue_date}</td>
                  <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-600">{n.reason || "-"}</td>
                  <td className="px-4 py-2 text-center">
                    {n.status_code === "cancelled" ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 rounded line-through">Cancelled</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded">{n.status_name || "Issued"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono font-semibold text-gray-900">
                    {n.note_type === "credit" ? "-" : "+"} {Number(n.total).toFixed(2)}
                  </td>
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
