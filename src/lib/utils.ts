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
