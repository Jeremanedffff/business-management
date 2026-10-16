import { Link } from "react-router-dom";

export function TaxTabs({ active }: { active: "rates" | "categories" }) {
  const base =
    "border-b-2 pb-3 px-1 text-sm font-medium transition-colors";
  const activeCls = "border-blue-600 text-blue-700";
  const inactiveCls =
    "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300";

  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="-mb-px flex gap-4">
        <Link
          to="/settings/tax"
          className={`${base} ${active === "rates" ? activeCls : inactiveCls}`}
        >
          Tax Rates
        </Link>
        <Link
          to="/settings/tax/categories"
          className={`${base} ${active === "categories" ? activeCls : inactiveCls}`}
        >
          Tax Categories
        </Link>
      </nav>
    </div>
  );
}
