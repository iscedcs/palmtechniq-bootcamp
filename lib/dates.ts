/**
 * Everything student-facing is rendered in Lagos time, regardless of where the
 * server or the reader happens to be. A session at "10:00" means 10:00 at AMG
 * Workspace and nothing else.
 */
export const LAGOS = "Africa/Lagos";

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-NG", { timeZone: LAGOS, ...options });

/** "Wed 26 Aug" */
export const shortDate = fmt({
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "Wednesday 26 August 2026" */
export const longDate = fmt({
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "26 Aug 2026" */
export const compactDate = fmt({
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "10:00" */
export const time = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });

/** "Wed 26 Aug, 10:00" */
export function dateAndTime(date: Date): string {
  return `${shortDate.format(date)}, ${time.format(date)}`;
}

/** A stable machine-readable value for <time dateTime>. */
export function isoDate(date: Date): string {
  return date.toISOString();
}

/** Whole days from now until `date`, floored at zero. */
export function daysUntil(date: Date, from: Date = new Date()): number {
  const ms = date.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
