interface StatusBadgeProps {
  code: string | null | undefined;
  name: string | null | undefined;
  amountPaid?: number | string | null;
  total?: number | string | null;
  dueDate?: string | null;
}

const COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border border-gray-200",
  approved_unpaid: "bg-blue-50 text-blue-700 border border-blue-200",
  approved_partial: "bg-amber-50 text-amber-800 border border-amber-200",
  approved_paid: "bg-green-50 text-green-700 border border-green-200",
  overdue: "bg-red-50 text-red-700 border border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border border-gray-200 line-through",
};

interface Derived {
  code: string;
  label: string;
}

function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function deriveStatus(
  code: string | null | undefined,
  name: string | null | undefined,
  amountPaid: number | string | null | undefined,
  total: number | string | null | undefined,
  dueDate: string | null | undefined,
): Derived | null {
  if (!code) return null;

  if (code === "draft") {
    return { code: "draft", label: name || "Draft" };
  }

  if (code === "cancelled") {
    return { code: "cancelled", label: name || "Cancelled" };
  }

  // Payment-derived states for both "approved" and "paid"
  if (code === "approved" || code === "paid") {
    const paid = amountPaid != null ? Number(amountPaid) : null;
    const t = total != null ? Number(total) : null;

    const isFullyPaid =
      code === "paid" || (paid != null && t != null && t > 0 && paid >= t);

    // Fully paid takes priority — an overdue fully-paid invoice is still paid
    if (isFullyPaid) {
      return { code: "approved_paid", label: "Approved & Paid" };
    }

    // Overdue wins over "unpaid"/"partial" because it needs attention now
    if (isOverdue(dueDate)) {
      return { code: "overdue", label: "Overdue" };
    }

    // Partially paid
    if (paid != null && t != null && paid > 0 && paid < t) {
      return { code: "approved_partial", label: "Approved & Partially Paid" };
    }

    // Fully unpaid (default for approved)
    return { code: "approved_unpaid", label: "Approved & Unpaid" };
  }

  // Unknown code — show the raw name if we have it
  return { code: code, label: name || code };
}

export function StatusBadge({
  code,
  name,
  amountPaid,
  total,
  dueDate,
}: StatusBadgeProps) {
  const derived = deriveStatus(code, name, amountPaid, total, dueDate);

  if (!derived) {
    return (
      <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-600 border border-gray-200">
        Unknown
      </span>
    );
  }

  const cls =
    COLORS[derived.code] || "bg-gray-100 text-gray-700 border border-gray-200";

  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md ${cls}`}>
      {derived.label}
    </span>
  );
}