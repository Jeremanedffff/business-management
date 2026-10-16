import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { displayRoleName } from "../../utils/roleNames";

import {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  type Invitation,
} from "../../api/invitations";
import { listRoles, type Role } from "../../api/roles";
import {
  listUsers,
  listAllUsers,
  updateUser,
  type User,
} from "../../api/users";
import { useAuthStore } from "../../store/authStore";

function statusOf(inv: Invitation): { label: string; cls: string } {
  if (inv.accepted_at) return { label: "Accepted", cls: "bg-green-100 text-green-700" };
  if (inv.revoked_at) return { label: "Revoked", cls: "bg-gray-100 text-gray-600" };
  if (new Date(inv.expires_at) <= new Date())
    return { label: "Expired", cls: "bg-amber-100 text-amber-700" };
  return { label: "Pending", cls: "bg-blue-100 text-blue-700" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

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

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [showAllInvitations, setShowAllInvitations] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, inv, r] = await Promise.all([
        currentUser?.is_superuser ? listAllUsers() : listUsers(),
        listInvitations(),
        listRoles(),
      ]);
      setUsers(u);
      setInvitations(inv);
      setRoles(r);
      setError(null);
    } catch (err: unknown) {
      setError(extractError(err, "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.is_superuser]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleResend(invitationId: string) {
    if (!confirm("Resend this invitation? The previous link will stop working.")) return;
    setBusyInvitationId(invitationId);
    try {
      await resendInvitation(invitationId);
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to resend invitation"));
    } finally {
      setBusyInvitationId(null);
    }
  }

  async function handleRevoke(invitationId: string) {
    if (!confirm("Revoke this invitation? The link will stop working.")) return;
    setBusyInvitationId(invitationId);
    try {
      await revokeInvitation(invitationId);
      await load();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to revoke invitation"));
    } finally {
      setBusyInvitationId(null);
    }
  }

  async function handleToggleActive(user: User) {
    const nextActive = !user.is_active;
    const verb = nextActive ? "Reactivate" : "Deactivate";
    if (!confirm(`${verb} ${user.email}?`)) return;
    setBusyUserId(user.id);
    try {
      await updateUser(user.id, { is_active: nextActive });
      await load();
    } catch (err: unknown) {
      setError(extractError(err, `Failed to ${verb.toLowerCase()} user`));
    } finally {
      setBusyUserId(null);
    }
  }

  const pendingInvitations = invitations.filter(
    (i) =>
      !i.accepted_at &&
      !i.revoked_at &&
      new Date(i.expires_at) > new Date()
  );

  const visibleInvitations = showAllInvitations ? invitations : pendingInvitations;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">
            {users.length} user{users.length !== 1 ? "s" : ""}
            {pendingInvitations.length > 0
              ? ` · ${pendingInvitations.length} pending invitation${pendingInvitations.length !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            {showInviteForm ? "Cancel" : "+ Invite User"}
          </button>
        </div>
      </div>

      {showInviteForm && (
        <InviteUserForm
          roles={roles}
          onCreated={() => {
            setShowInviteForm(false);
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
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Email
                    </th>
                    {currentUser?.is_superuser && (
                      <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                        Business
                      </th>
                    )}
                    <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const busy = busyUserId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {u.first_name} {u.last_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {u.email}
                          {isSelf && (
                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                          )}
                        </td>
                        {currentUser?.is_superuser && (
                          <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-600">
                            {u.tenant_name || "-"}
                          </td>
                        )}
                        <td className="hidden md:table-cell px-4 py-2 text-sm">
                          {u.is_active ? (
                            <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                          <Link
                            to={`/users/${u.id}`}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Manage roles
                          </Link>
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              disabled={busy}
                              className={`text-sm font-medium disabled:opacity-50 ${
                                u.is_active
                                  ? "text-red-600 hover:text-red-700"
                                  : "text-green-600 hover:text-green-700"
                              }`}
                            >
                              {busy
                                ? "..."
                                : u.is_active
                                ? "Deactivate"
                                : "Reactivate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {invitations.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">
                    Invitations
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {showAllInvitations
                      ? `Showing all ${invitations.length}`
                      : `Showing ${pendingInvitations.length} pending`}
                  </p>
                </div>
                <button
                  onClick={() => setShowAllInvitations(!showAllInvitations)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showAllInvitations ? "Show pending only" : "Show all invitations"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                        Email
                      </th>
                      <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                        Role
                      </th>
                      <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                        Sent
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleInvitations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-sm text-gray-500"
                        >
                          No invitations to show.
                        </td>
                      </tr>
                    ) : (
                      visibleInvitations.map((inv) => {
                        const s = statusOf(inv);
                        const role = roles.find((r) => r.id === inv.role_id);
                        const busy = busyInvitationId === inv.id;
                        return (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {inv.email}
                            </td>
                            <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-600">
                              {role?.name || "—"}
                            </td>
                            <td className="hidden md:table-cell px-4 py-2 text-xs text-gray-500">
                              {inv.email_sent_at ? formatDate(inv.email_sent_at) : "Not sent"}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`inline-block px-2 py-0.5 text-xs rounded ${s.cls}`}
                              >
                                {s.label}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                              {s.label === "Pending" && (
                                <>
                                  <button
                                    onClick={() => handleResend(inv.id)}
                                    disabled={busy}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                                  >
                                    Resend
                                  </button>
                                  <button
                                    onClick={() => handleRevoke(inv.id)}
                                    disabled={busy}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                                  >
                                    Revoke
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InviteUserForm({
  roles,
  onCreated,
}: {
  roles: Role[];
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!roleId) {
      setError("Please select a role");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const invitation = await createInvitation({
        email,
        role_id: roleId,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
      if (invitation.email_sent_at) {
        setSuccess(`Invitation sent to ${invitation.email}`);
      } else {
        setSuccess(
          `Invitation created for ${invitation.email}, but the email could not be sent. ` +
            `You can resend it from the list below.`
        );
      }
      setEmail("");
      setFirstName("");
      setLastName("");
      setRoleId("");
      onCreated();
    } catch (err: unknown) {
      setError(extractError(err, "Failed to send invitation"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-4 bg-white rounded-lg border border-gray-200"
    >
      <h3 className="font-semibold text-gray-900 mb-1">Invite User</h3>
      <p className="text-xs text-gray-500 mb-3">
        The user will receive an email with a link to set their password.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="Email *"
          value={email}
          onChange={setEmail}
          type="email"
          required
        />
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">— Select role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {displayRoleName(r.name)}
              </option>
            ))}
          </select>
        </div>
        <Field label="First Name" value={firstName} onChange={setFirstName} />
        <Field label="Last Name" value={lastName} onChange={setLastName} />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-700">{success}</p>}
      <div className="mt-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300"
        >
          {submitting ? "Sending..." : "Send Invitation"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
