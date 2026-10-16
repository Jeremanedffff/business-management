import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { displayRoleName } from "../../utils/roleNames";

import { listRoles, type Role } from "../../api/roles";
import {
  assignRole,
  getUser,
  unassignRole,
  type UserWithRoles,
} from "../../api/users";

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserWithRoles | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [u, r] = await Promise.all([getUser(userId), listRoles()]);
      setUser(u);
      setRoles(r);
      setError(null);
    } catch {
      setError("Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssign(roleId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await assignRole(userId, roleId);
      await load();
    } catch {
      setError("Failed to assign role");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign(roleId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await unassignRole(userId, roleId);
      await load();
    } catch {
      setError("Failed to remove role");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error || !user) return <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>;

  const unassigned = roles.filter((r) => !user.role_ids.includes(r.id));

  return (
    <div>
      <div className="mb-6">
        <Link to="/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          ? Back to Users
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
          {user.first_name} {user.last_name}
        </h1>
        <p className="text-sm text-gray-500">{user.email}</p>
        {user.is_superuser && (
          <p className="text-xs mt-1 inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
            Superuser (bypasses all permission checks)
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Assigned Roles</h2>
        {user.role_ids.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">No roles assigned. This user has no permissions.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {user.role_ids.map((rid, idx) => (
              <div key={rid} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-800">
                  {displayRoleName(user.role_names[idx])}
                </span>
                <button
                  onClick={() => handleUnassign(rid)}
                  disabled={busy}
                  className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Assign a new role</h3>
          {unassigned.length === 0 ? (
            <p className="text-sm text-gray-500">All available roles are already assigned.</p>
          ) : (
            <div className="space-y-2">
              {unassigned.map((r) => (
                <div key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    {r.description && (
                      <p className="text-xs text-gray-500">{r.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAssign(r.id)}
                    disabled={busy}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
