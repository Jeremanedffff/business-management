import { FormEvent, useEffect, useState } from "react";

import { listPaymentMethods, recordPayment, type PaymentMethodInfo } from "../../api/payments";

interface PaymentModalProps {
  invoiceId: string;
  outstanding: string;
  onClose: () => void;
  onRecorded: () => void;
}

export function PaymentModal({ invoiceId, outstanding, onClose, onRecorded }: PaymentModalProps) {
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(outstanding);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [payerPhone, setPayerPhone] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPaymentMethods()
      .then(setMethods)
      .catch(() => setError("Failed to load payment methods"));
  }, []);

  const selected = methods.find((m) => m.code === method);
  const isMobileMoney = selected?.is_mobile_money || false;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isMobileMoney && !payerPhone.trim()) {
      setError("Phone number is required for mobile money");
      return;
    }

    setSubmitting(true);
    try {
      await recordPayment(invoiceId, {
        amount,
        payment_date: paymentDate || undefined,
        payment_method: method,
        payer_phone: payerPhone || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      onRecorded();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h3 className="font-semibold text-gray-900">Record Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">?</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Outstanding: M {Number(outstanding).toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Method *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {methods.map((m) => (
                <option key={m.code} value={m.code}>{m.label}</option>
              ))}
            </select>
          </div>

          {isMobileMoney && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded space-y-3">
              <p className="text-xs text-blue-800 font-medium">Mobile Money Details</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Phone *</label>
                <input
                  type="tel"
                  placeholder="+266 5XXX XXXX"
                  required
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Lesotho: 8 digits after +266</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {selected?.label} Transaction Reference
                </label>
                <input
                  placeholder="e.g. MPESA-ABC123XYZ"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {!isMobileMoney && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reference</label>
              <input
                placeholder="e.g. receipt number, bank ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:bg-green-300"
            >
              {submitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

