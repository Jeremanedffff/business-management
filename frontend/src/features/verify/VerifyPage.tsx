import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  verifyInvoice,
  type PublicInvoiceVerifyResponse,
} from "../../api/public";

export function VerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<PublicInvoiceVerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    verifyInvoice(token)
      .then((inv) => {
        setInvoice(inv);
        setError(null);
      })
      .catch((err: unknown) => {
        const axiosError = err as {
          response?: { status?: number; data?: { detail?: string } };
        };
        if (axiosError.response?.status === 404) {
          setError("Invoice not found or not available for verification.");
        } else {
          setError("Unable to verify this invoice right now.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link
          to="/"
          className="block text-center mb-6 text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {loading ? (
            <div className="text-center text-slate-500 py-12">
              Verifying invoice...
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto bg-red-50 border border-red-200 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Verification failed
              </h1>
              <p className="text-sm text-slate-600">{error}</p>
            </div>
          ) : invoice ? (
            <>
              {/* Success header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto bg-green-50 border border-green-200 rounded-full flex items-center justify-center mb-3">
                  <svg
                    className="w-7 h-7 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900">
                  Invoice Verified
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  This invoice was issued by
                  {invoice.company_name ? ` ${invoice.company_name}` : ""}.
                </p>
              </div>

              {/* Invoice details */}
              <div className="border-t border-slate-200 pt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Number</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {invoice.invoice_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Issue Date</span>
                  <span className="text-slate-900">{invoice.issue_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {invoice.currency_code}{" "}
                    {Number(invoice.total).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                    {invoice.status_name}
                  </span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
                Verified at{" "}
                {new Date(invoice.verified_at).toLocaleString()}
              </div>
            </>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center">
          This page confirms an invoice was issued by this business. For
          questions, contact the business directly.
        </p>
      </div>
    </div>
  );
}
