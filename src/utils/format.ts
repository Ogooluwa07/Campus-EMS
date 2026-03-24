export function formatDateTime(value: any): string {
  try {
    if (!value) return "TBA";

    let d: Date | null = null;

    if (value instanceof Date) d = value;
    else if (typeof value?.toDate === "function") d = value.toDate();
    else if (typeof value?.seconds === "number") d = new Date(value.seconds * 1000);
    else if (typeof value === "string") d = new Date(value);

    if (!d || Number.isNaN(d.getTime())) return "TBA";

    return d.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "TBA";
  }
}
