import { FormEvent, useEffect, useState } from "react";
import { displayRoleName } from "../../utils/roleNames";

import {
  createRole,
  listAllPermissions,
  listRoles,
  type Permission,
  type Role,
} from "../../api/roles";

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([listRoles(), listAllPermissions()]);
      setRoles(r);
      setPermissions(p);
      setError(null);
    } catch {
      setError("Failed to load roles");
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
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500">{roles.length} total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          {showForm ? "Cancel" : "+ New Role"}
        </button>
      </div>

      {showForm && (
        <RoleForm
          permissions={permissions}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{displayRoleName(r.name)}</td>
                  <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-600">{r.description || "-"}</td>
                  <td className="px-4 py-2 text-sm">
                    {r.is_system ? (
                      <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">System</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Custom</span>
                    )}
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

function RoleForm({ permissions, onCreated }: { permissions: Permission[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createRole({
        name,
        description: description || undefined,
        permission_ids: Array.from(selected),
      });
      onCreated();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to create role");
    } finally {
      setSubmitting(false);
    }
  }

  const byModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">New Role</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Permissions ({selected.size} selected)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(byModule).map(([module, perms]) => (
            <div key={module} className="p-3 border border-gray-200 rounded">
              <p className="text-xs font-semibold text-gray-700 uppercase mb-2">{module}</p>
              <div className="space-y-1">
                {perms.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-700">{p.action}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300"
        >
          {submitting ? "Creating..." : "Create Role"}
        </button>
      </div>
    </form>
  );
}

