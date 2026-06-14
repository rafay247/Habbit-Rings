// Date helpers ported 1:1 from the original script.js so behaviour is identical.

export function todayISO(date: Date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, offset: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + offset));
  return todayISO(date);
}

export function isSameYear(iso: string, year: number): boolean {
  return Number(iso.slice(0, 4)) === year;
}

export function formatHumanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
