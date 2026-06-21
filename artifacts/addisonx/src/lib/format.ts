// Shared money/number formatters for the customer dashboard pages.
// Indian numbering: k (thousand), L (lakh = 1e5), Cr (crore = 1e7).

export const formatINR = (value: number | string): string => {
  const n = Number(value) || 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${Math.round(abs)}`;
};

// Full grouped value (e.g. ₹1,23,456) for precise displays like invoice totals.
export const formatINRFull = (value: number | string): string => {
  const n = Number(value) || 0;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// YYYY-MM-DD for <input type="date"> values.
export const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

// Download a CSV file from a header row + data rows (client-side, no deps).
export const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
