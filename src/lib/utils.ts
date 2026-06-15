import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `YYYY-MM-DD` (UTC) for a date — the value shape native to `<input type="date">`. */
export function toUtcDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse a `YYYY-MM-DD` date-only value into a local Date for calendar widgets. */
export function fromDateInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return undefined;
  }
  return date;
}

/** Format a calendar Date as the date-only value stored by the filter form. */
export function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function roundMagnitude(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatMagnitude(value: number): string {
  return value.toFixed(1);
}
