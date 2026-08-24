import {
  differenceInCalendarDays,
  format,
  isSameDay,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
} from 'date-fns';

export const todayKey = (d: Date = new Date()) => format(d, 'yyyy-MM-dd');

export const toDate = (value: string | number | Date): Date =>
  value instanceof Date ? value : typeof value === 'number' ? new Date(value) : parseISO(value);

/** "Today", "Yesterday", "Tuesday", then "14 March" once it is older than a week. */
export function friendlyDate(value: string | number | Date): string {
  const date = toDate(value);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  const days = Math.abs(differenceInCalendarDays(new Date(), date));
  if (days < 7) return format(date, 'EEEE');
  if (date.getFullYear() === new Date().getFullYear()) return format(date, 'd MMMM');
  return format(date, 'd MMMM yyyy');
}

export const prettyDate = (value: string | number | Date) => format(toDate(value), 'd MMMM yyyy');
export const prettyTime = (value: string | number | Date) => format(toDate(value), 'h:mm a');
export const monthDay = (value: string | number | Date) => format(toDate(value), 'MMM d');

/** Minutes → "1h 20m" / "45m" */
export function duration(minutes: number): string {
  if (minutes < 1) return 'less than a minute';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Same month & day, different year — the engine behind "This Day in Reading". */
export function isAnniversaryOf(value: string | number | Date, on: Date = new Date()): boolean {
  const date = toDate(value);
  return (
    date.getMonth() === on.getMonth() &&
    date.getDate() === on.getDate() &&
    date.getFullYear() !== on.getFullYear()
  );
}

export function daysBetween(a: string | number | Date, b: string | number | Date): number {
  return Math.abs(differenceInCalendarDays(toDate(a), toDate(b)));
}

export { isSameDay, startOfDay, format };
