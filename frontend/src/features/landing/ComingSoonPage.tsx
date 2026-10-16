import { Link, useParams } from "react-router-dom";

const FEATURE_MAP: Record<string, { title: string; description: string }> = {
  purchases: { title: "Purchases", description: "Purchase orders, bills, and supplier management. Coming soon in a future release." },
  "purchases-overview": { title: "Purchases Overview", description: "An overview of your purchase activity. Coming soon." },
  bills: { title: "Bills", description: "Track supplier bills and manage accounts payable. Coming soon." },
  "purchase-orders": { title: "Purchase Orders", description: "Create and manage purchase orders to suppliers. Coming soon." },
  suppliers: { title: "Suppliers", description: "Manage your suppliers and their contact details. Coming soon." },
  quotes: { title: "Quotes", description: "Send quotations to customers and convert them into invoices. Coming soon." },
  "sales-overview": { title: "Sales Overview", description: "An overview of your sales activity. Coming soon." },
  "balance-sheet": { title: "Balance Sheet", description: "A snapshot of your assets, liabilities, and equity. Coming soon." },
  "profit-loss": { title: "Profit and Loss", description: "Your income statement. Coming soon." },
  "cash-flow": { title: "Cash Flow Manager", description: "Track where your cash is coming from and going. Coming soon." },
  "tax-report": { title: "Tax Report", description: "VAT and levy reporting. Coming soon." },
  "chart-of-accounts": { title: "Chart of Accounts", description: "Structure your accounts for double-entry bookkeeping. Coming soon." },
  "manual-journals": { title: "Manual Journals", description: "Post adjusting entries to your accounts. Coming soon." },
  "bank-accounts": { title: "Bank Accounts", description: "Link your bank accounts and import statements. Coming soon." },
};

export function ComingSoonPage() {
  const { feature } = useParams<{ feature: string }>();
  const info = FEATURE_MAP[feature || ""] || { title: "Coming Soon", description: "This feature is on the roadmap and will be released in a future update." };

  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full mb-6">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
        Coming soon
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{info.title}</h1>
      <p className="text-lg text-gray-600 leading-relaxed mb-8">{info.description}</p>
      <div className="flex gap-3 justify-center">
        <Link to="/dashboard" className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Back to Dashboard</Link>
        <Link to="/invoices" className="px-6 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50">Go to Invoices</Link>
      </div>
      <p className="mt-12 text-sm text-gray-400">We are building this feature. Join the waitlist on the home page to get notified.</p>
    </div>
  );
}

