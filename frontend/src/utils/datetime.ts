const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

/** Format an ISO date (YYYY-MM-DD) as "04 Oct 2026". Returns "" for null. */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  const monthIdx = Number(m) - 1;
  if (!y || !d || Number.isNaN(monthIdx) || !MONTHS[monthIdx]) return iso;
  return `${d} ${MONTHS[monthIdx]} ${y}`;
}

/**
 * Format an ISO datetime (UTC) as "04 Oct 2026, 14:32 SAST".
 * Lesotho time is UTC+2 all year (SAST).
 * Returns "" for null.
 */
export function formatDateTimeSAST(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sast = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const day = String(sast.getUTCDate()).padStart(2, "0");
  const month = MONTHS[sast.getUTCMonth()];
  const year = sast.getUTCFullYear();
  const hh = String(sast.getUTCHours()).padStart(2, "0");
  const mm = String(sast.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm} SAST`;
}