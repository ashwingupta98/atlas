import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow, parseISO } from "date-fns";

export const fmtMoney = (amount, currency = "USD") => {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
};

export const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
};

export const fmtDateLong = (iso) => {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "EEEE, MMMM d");
  } catch {
    return iso;
  }
};

export const fmtRelative = (iso) => {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return (isPast(d) ? "" : "in ") + formatDistanceToNowStrict(d, { addSuffix: isPast(d) });
  } catch {
    return "";
  }
};

export const isOverdue = (iso) => {
  if (!iso) return false;
  try { return isPast(parseISO(iso)) && !isToday(parseISO(iso)); } catch { return false; }
};

export const toInputDate = (iso) => {
  if (!iso) return "";
  try { return format(parseISO(iso), "yyyy-MM-dd"); } catch { return ""; }
};

export const fromInputDate = (str) => {
  if (!str) return null;
  // Treat as UTC midnight to avoid TZ shifts
  return new Date(str + "T00:00:00Z").toISOString();
};
