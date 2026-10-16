import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";

interface NavLinkItem {
  label: string;
  path: string;
  permission?: string;
}

interface NavGroup {
  label: string;
  path?: string;
  permission?: string;
  superuserOnly?: boolean;
  items?: NavLinkItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { label: "Home", path: "/dashboard" },
  {
    label: "Sales",
    permission: "invoice.view",
    items: [
      { label: "Invoices", path: "/invoices", permission: "invoice.view" },
      { label: "Credit Notes", path: "/adjustment-notes?note_type=credit", permission: "invoice.view" },
      { label: "Products & Services", path: "/products", permission: "product.view" },
      { label: "Customers", path: "/customers", permission: "customer.view" },
      { label: "Quotes", path: "/coming-soon/quotes", permission: "invoice.view" },
    ],
  },
  {
    label: "Purchases",
    permission: "invoice.view",
    items: [
      { label: "Debit Notes", path: "/adjustment-notes?note_type=debit", permission: "invoice.view" },
      { label: "Purchases Overview", path: "/coming-soon/purchases-overview" },
      { label: "Bills", path: "/coming-soon/bills" },
      { label: "Purchase Orders", path: "/coming-soon/purchase-orders" },
      { label: "Suppliers", path: "/coming-soon/suppliers" },
    ],
  },
  {
    label: "Reporting",
    permission: "invoice.view",
    items: [
      { label: "Dashboard", path: "/dashboard", permission: "invoice.view" },
      { label: "Balance Sheet", path: "/coming-soon/balance-sheet" },
      { label: "Profit & Loss", path: "/coming-soon/profit-loss" },
      { label: "Cash Flow Manager", path: "/coming-soon/cash-flow" },
      { label: "Tax Report", path: "/coming-soon/tax-report" },
    ],
  },
  {
    label: "Accounting",
    permission: "invoice.view",
    items: [
      { label: "Payment Methods", path: "/payment-methods", permission: "setting.manage" },
      { label: "Fiscal Periods", path: "/fiscal-periods", permission: "setting.manage" },
      { label: "Chart of Accounts", path: "/coming-soon/chart-of-accounts" },
      { label: "Manual Journals", path: "/coming-soon/manual-journals" },
    ],
  },
  {
    label: "Tax",
    permission: "invoice.view",
    items: [
      { label: "Tax Settings", path: "/settings/tax", permission: "setting.manage" },
      { label: "Tax Report", path: "/coming-soon/tax-report" },
    ],
  },
  {
    label: "Contacts",
    permission: "customer.view",
    items: [
      { label: "Customers", path: "/customers", permission: "customer.view" },
      { label: "Suppliers", path: "/coming-soon/suppliers" },
    ],
  },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);

  function signOut() {
    logout();
    navigate("/login");
  }

  function isActive(path: string): boolean {
    const cleanPath = path.split("?")[0];
    return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + "/");
  }

  function groupHasActive(group: NavGroup): boolean {
    if (group.path && isActive(group.path)) return true;
    if (group.items) return group.items.some((i) => isActive(i.path));
    return false;
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setMobileOpenGroup(null);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white sticky top-0 z-40">
        <div className="max-w-full px-4">
          <div className="flex items-center h-14 gap-2">

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded hover:bg-slate-800 flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link to="/dashboard" className="flex items-center gap-2 mr-2 lg:mr-4 flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-sm hidden sm:inline">MalutiRecon</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex flex-1 items-center gap-0.5 overflow-visible">
              {NAV_GROUPS.map((group) => {
                const permitted = (!group.permission || hasPermission(group.permission)) && (!group.superuserOnly || user?.is_superuser);
                if (!permitted) return null;
                const active = groupHasActive(group);

                if (!group.items) {
                  return (
                    <Link key={group.label} to={group.path!} className={`px-3 py-2 text-sm rounded whitespace-nowrap ${active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>{group.label}</Link>
                  );
                }

                const visibleItems = group.items.filter((item) => !item.permission || hasPermission(item.permission));
                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.label} className="relative inline-block" onMouseEnter={() => setOpenGroup(group.label)} onMouseLeave={() => setOpenGroup(null)}>
                    <button className={`px-3 py-2 text-sm rounded whitespace-nowrap flex items-center gap-1 ${active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
                      {group.label}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {openGroup === group.label && (
                      <div className="absolute top-full left-0 mt-0 w-64 bg-white text-gray-800 rounded-md shadow-lg border border-gray-200 py-1 z-50">
                        {visibleItems.map((item) => {
                          const isSoon = item.path.startsWith("/coming-soon/");
                          return (
                            <Link key={item.label} to={item.path} className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 ${isActive(item.path) ? "bg-gray-100 font-medium" : ""}`} onClick={() => setOpenGroup(null)}>
                              <span>{item.label}</span>
                              {isSoon && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Soon</span>}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Spacer on mobile so user menu stays right */}
            <div className="flex-1 lg:hidden" />

            <div className="relative flex-shrink-0">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                </div>
                <span className="text-sm hidden md:inline">{user?.first_name}</span>
                <svg className="w-3 h-3 hidden md:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-0 w-56 bg-white text-gray-800 rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  {user?.is_superuser && (
                    <>
                      <div className="px-4 py-2 bg-purple-50 border-b border-purple-100">
                        <p className="text-xs font-semibold text-purple-700 uppercase">System Admin</p>
                      </div>
                      <Link to="/tenants" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>Manage Businesses</Link>
                    </>
                  )}
                  {hasPermission("user.manage") && (
                    <Link to="/users" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>Users</Link>
                  )}
                  {hasPermission("role.manage") && (
                    <Link to="/roles" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>Roles</Link>
                  )}
                  {hasPermission("setting.manage") && (
                    <Link to="/settings" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>Settings</Link>
                  )}
                  {hasPermission("setting.manage") && (
                    <Link to="/settings/audit" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>Audit Log</Link>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={signOut} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="font-bold text-sm text-gray-900">MalutiRecon</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {NAV_GROUPS.map((group) => {
                const permitted = (!group.permission || hasPermission(group.permission)) && (!group.superuserOnly || user?.is_superuser);
                if (!permitted) return null;

                if (!group.items) {
                  const active = isActive(group.path!);
                  return (
                    <Link
                      key={group.label}
                      to={group.path!}
                      className={`block px-4 py-3 text-sm font-medium ${active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {group.label}
                    </Link>
                  );
                }

                const visibleItems = group.items.filter((item) => !item.permission || hasPermission(item.permission));
                if (visibleItems.length === 0) return null;

                const expanded = mobileOpenGroup === group.label;
                const groupActive = groupHasActive(group);

                return (
                  <div key={group.label}>
                    <button
                      onClick={() => setMobileOpenGroup(expanded ? null : group.label)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium ${groupActive ? "text-blue-700" : "text-gray-700"} hover:bg-gray-50`}
                    >
                      <span>{group.label}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expanded && (
                      <div className="bg-gray-50 py-1">
                        {visibleItems.map((item) => {
                          const isSoon = item.path.startsWith("/coming-soon/");
                          const itemActive = isActive(item.path);
                          return (
                            <Link
                              key={item.label}
                              to={item.path}
                              className={`flex items-center justify-between pl-8 pr-4 py-2.5 text-sm ${itemActive ? "text-blue-700 font-medium" : "text-gray-600"} hover:bg-gray-100`}
                            >
                              <span>{item.label}</span>
                              {isSoon && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Soon</span>}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-500 mb-3">{user?.email}</p>
              <button
                onClick={signOut}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Sign Out
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
