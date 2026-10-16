import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getRecentInvoices,
  getRevenueByMonth,
  getSummary,
  getTopCustomers,
  getSystemStats,
  type DashboardSummary,
  type RecentInvoice,
  type RevenueByMonth,
  type TopCustomer,
  type SystemStats,
} from "../../api/dashboard";
import { Can } from "../auth/Can";
import { usePermission } from "../auth/usePermission";
import { useAuthStore } from "../../store/authStore";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canViewCustomers = usePermission("customer.view");
  const canViewProducts = usePermission("product.view");
  const canViewInvoices = usePermission("invoice.view");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const [revenue, setRevenue] = useState<RevenueByMonth[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.is_superuser) {
      // Load system stats for superuser
      getSystemStats()
        .then(setSystemStats)
        .catch(() => setError("Failed to load system statistics"))
        .finally(() => setLoading(false));
    } else if (!canViewInvoices) {
      setLoading(false);
    } else {
      // Load tenant-specific dashboard for business admins
      Promise.all([getSummary(), getRecentInvoices(), getRevenueByMonth(), getTopCustomers()])
        .then(([s, r, rev, tc]) => {
          setSummary(s);
          setRecent(r);
          setRevenue(rev);
          setTopCustomers(tc);
        })
        .catch(() => setError("Failed to load dashboard data"))
        .finally(() => setLoading(false));
    }
  }, [canViewInvoices, user?.is_superuser]);

  // Show system-wide dashboard for superuser
  if (user?.is_superuser) {
    if (loading) {
      return <div className="text-gray-500">Loading system statistics...</div>;
    }
    if (error || !systemStats) {
      return <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>;
    }
    return <SystemAdminDashboard stats={systemStats} />;
  }

  // If user has no invoice.view permission, show a simplified welcome
  if (!canViewInvoices) {
    return <SimpleWelcome firstName={user?.first_name || ""} />;
  }

  if (loading) {
    return <div className="text-gray-500">Loading dashboard...</div>;
  }

  if (error || !summary) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>;
  }

  const maxRevenue = Math.max(...revenue.map((r) => Number(r.total)), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back, {user?.first_name}. Here is what is happening in your business.
        </p>
      </div>

      {/* Stat cards - revenue + outstanding always shown if user can view invoices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={`M ${Number(summary.total_revenue).toFixed(2)}`}
          sub={`${summary.total_invoices} invoices`}
          color="blue"
        />
        <StatCard
          label="Outstanding"
          value={`M ${Number(summary.outstanding).toFixed(2)}`}
          sub={`${summary.unpaid_count} unpaid`}
          color="amber"
        />
        {canViewCustomers && (
          <StatCard
            label="Customers"
            value={String(summary.total_customers)}
            sub="active"
            color="green"
          />
        )}
        {canViewProducts && (
          <StatCard
            label="Products"
            value={String(summary.total_products)}
            sub="active"
            color="purple"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Revenue chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue by Month</h2>
          {revenue.length === 0 ? (
            <p className="text-sm text-gray-500">No revenue data yet.</p>
          ) : (
            <div className="space-y-3">
              {revenue.map((r) => {
                const pct = (Number(r.total) / maxRevenue) * 100;
                return (
                  <div key={r.month}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{r.month}</span>
                      <span className="font-mono">M {Number(r.total).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded h-3">
                      <div
                        className="bg-blue-500 h-3 rounded"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top customers - only for users with customer.view */}
        {canViewCustomers && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Top Customers</h2>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-gray-500">No customers yet.</p>
            ) : (
              <div className="space-y-2">
                {topCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {c.code} · {c.invoice_count} invoices
                      </p>
                    </div>
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      M {Number(c.total).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
          <Link
            to="/invoices"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-2">Number</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-2">Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-2">Reference</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 text-sm font-mono text-blue-700">{inv.invoice_number}</td>
                  <td className="py-2 text-sm text-gray-600">{inv.issue_date}</td>
                  <td className="py-2 text-sm text-gray-600">{inv.reference || "�"}</td>
                  <td className="py-2 text-sm text-right font-mono font-semibold text-gray-900">
                    M {Number(inv.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Quick actions - filtered by permission */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction to="/invoices" label="Create Invoice" />
        <Can permission="customer.create">
          <QuickAction to="/customers" label="Add Customer" />
        </Can>
        <Can permission="product.create">
          <QuickAction to="/products" label="Add Product" />
        </Can>
      </div>
    </div>
  );
}

function SimpleWelcome({ firstName }: { firstName: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        Welcome, {firstName}
      </h1>
      <p className="text-gray-600">
        Your account does not currently have access to the dashboard. Please contact your administrator to request access.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "green" | "purple" | "amber";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
  };
  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <p className="text-xs uppercase font-semibold">{label}</p>
      <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
      <p className="text-xs mt-1">{sub}</p>
    </div>
  );
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow transition-all text-center"
    >
      <p className="text-sm font-medium text-blue-600">{label}</p>
    </Link>
  );
}

function SystemAdminDashboard({ stats }: { stats: SystemStats }) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-8 text-white shadow-lg sm:px-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              Platform at a glance
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Platform overview</h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
              Monitor business activity, users, invoices, and revenue across your platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/tenants"
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-950 shadow-sm transition hover:bg-blue-50"
            >
              Manage businesses
            </Link>
            <Link
              to="/users"
              className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View users
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SystemStatCard
          label="Total Businesses"
          value={String(stats.tenants.total)}
          sub={`${stats.tenants.active} active`}
          color="blue"
          icon="🏢"
        />
        <SystemStatCard
          label="Total Users"
          value={String(stats.users.total)}
          sub={`${stats.users.active} active`}
          color="green"
          icon="👥"
        />
        <SystemStatCard
          label="Total Invoices"
          value={String(stats.invoices.total)}
          sub={`${stats.invoices.paid} paid`}
          color="purple"
          icon="📄"
        />
        <SystemStatCard
          label="Total Revenue"
          value={`M ${stats.invoices.total_revenue.toFixed(2)}`}
          sub="All businesses"
          color="amber"
          icon="💰"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-900">
            <span className="text-2xl">🏢</span>
            Businesses Overview
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Active Businesses</span>
                <span className="font-semibold text-gray-900">{stats.tenants.active}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all"
                  style={{ width: `${(stats.tenants.active / Math.max(stats.tenants.total, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Inactive Businesses</span>
                <span className="font-semibold text-gray-900">{stats.tenants.inactive}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-2.5 rounded-full bg-gray-400 transition-all"
                  style={{ width: `${(stats.tenants.inactive / Math.max(stats.tenants.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-900">
            <span className="text-2xl">👥</span>
            Users Overview
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Active Users</span>
                <span className="font-semibold text-gray-900">{stats.users.active}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-2.5 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${(stats.users.active / Math.max(stats.users.total, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">System Admins (Superusers)</span>
                <span className="font-semibold text-gray-900">{stats.users.superusers}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-2.5 rounded-full bg-purple-500 transition-all"
                  style={{ width: `${(stats.users.superusers / Math.max(stats.users.total, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Business Admins</span>
                <span className="font-semibold text-gray-900">{stats.users.business_admins}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all"
                  style={{ width: `${(stats.users.business_admins / Math.max(stats.users.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoices breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-900">
            <span className="text-2xl">📄</span>
            Invoices Overview
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Paid Invoices</span>
                <span className="font-semibold text-gray-900">{stats.invoices.paid}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all"
                  style={{ width: `${(stats.invoices.paid / Math.max(stats.invoices.total, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Unpaid Invoices</span>
                <span className="font-semibold text-gray-900">{stats.invoices.unpaid}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-2.5 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${(stats.invoices.unpaid / Math.max(stats.invoices.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-900">
            <span className="text-2xl">💰</span>
            Revenue Summary
          </h2>
          <div className="text-center py-6">
            <p className="text-4xl font-bold text-gray-900 mb-2">
              M {stats.invoices.total_revenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">Total Revenue Across All Businesses</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.invoices.paid}</p>
              <p className="text-xs text-gray-600">Paid Invoices</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.invoices.unpaid}</p>
              <p className="text-xs text-gray-600">Unpaid Invoices</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          to="/tenants"
          className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">🏢</span>
            <div>
              <p className="font-semibold text-gray-900">Manage Businesses</p>
              <p className="mt-1 text-sm text-gray-600">Register and manage businesses across the platform</p>
            </div>
            <span className="ml-auto text-lg text-gray-400 transition group-hover:translate-x-1 group-hover:text-blue-600">→</span>
          </div>
        </Link>
        <Link
          to="/users"
          className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-2xl">👥</span>
            <div>
              <p className="font-semibold text-gray-900">Manage Users</p>
              <p className="mt-1 text-sm text-gray-600">Review users and manage platform access</p>
            </div>
            <span className="ml-auto text-lg text-gray-400 transition group-hover:translate-x-1 group-hover:text-blue-600">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function SystemStatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "green" | "purple" | "amber";
  icon: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    purple: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${colors[color]}`}>{icon}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[color]}`}>{sub}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}
