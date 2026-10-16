import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getInvoice, type Invoice } from "../../api/invoices";
import { InvoiceForm } from "./InvoiceForm";

export function InvoiceEditPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    getInvoice(invoiceId)
      .then((inv) => {
        if (inv.status_code && inv.status_code !== "draft") {
          setError(`Only draft invoices can be edited. This invoice is "${inv.status_code}".`);
        } else {
          setInvoice(inv);
        }
      })
      .catch(() => setError("Invoice not found"))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) return <div className="text-gray-500">Loading invoice...</div>;
  if (error || !invoice) {
    return (
      <div>
        <Link to={`/invoices/${invoiceId}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Back to invoice
        </Link>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error || "Invoice not found"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link to={`/invoices/${invoice.id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Back to invoice
        </Link>
      </div>
      <InvoiceForm
        initialInvoice={invoice}
        onCreated={() => navigate(`/invoices/${invoice.id}`)}
      />
    </div>
  );
}

