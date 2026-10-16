import { FormEvent, useCallback, useEffect, useState } from "react";

import { createCustomer, listCustomers, type Customer } from "../../api/customers";

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await listCustomers());
      setError(null);
    } catch {
      setError("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          {showForm ? "Cancel" : "+ New Customer"}
        </button>
      </div>

      {showForm && (
        <CustomerForm
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
      ) : customers.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          No customers yet. Create your first one.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">TIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono text-gray-700">{c.code}</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{c.email || "�"}</td>
                  <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-600">{c.phone || "�"}</td>
                  <td className="hidden md:table-cell px-4 py-2 text-sm font-mono text-gray-600">{c.tin || "�"}</td>
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

function CustomerForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tin, setTin] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createCustomer({
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        tin: tin || undefined,
        vat_number: vatNumber || undefined,
      });
      onCreated();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">New Customer</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name *" value={name} onChange={setName} required />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <Field label="TIN" value={tin} onChange={setTin} />
        <Field label="VAT Number" value={vatNumber} onChange={setVatNumber} />
        <Field label="Address" value={address} onChange={setAddress} />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300"
        >
          {submitting ? "Creating..." : "Create Customer"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
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
