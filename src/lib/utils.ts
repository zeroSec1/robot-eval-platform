export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatPercent(fraction: number | null, digits = 0) {
  if (fraction === null) return "-";
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) return "-";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

// Fixed locale + timeZone (rather than the runtime default) so this renders
// identical text on the server and in the browser — otherwise a server
// running in a different timezone than the visitor causes a real hydration
// mismatch (React error #418) on any client-rendered page using these.
const DATE_LOCALE = "en-US";
const DATE_TIME_ZONE = "UTC";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(DATE_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: DATE_TIME_ZONE,
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(DATE_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DATE_TIME_ZONE,
  });
}
