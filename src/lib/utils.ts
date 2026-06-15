import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MAGNITUDE_RADIUS_STOPS } from "@/lib/constants";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `YYYY-MM-DD` (UTC) for a date — the value shape native to `<input type="date">`. */
export function toUtcDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse a `YYYY-MM-DD` date-only value into a UTC-midnight Date for calendar
 * widgets. The numerals are interpreted as a UTC calendar day so they round-trip
 * losslessly with {@link toUtcDateInput}; pair with `timeZone="UTC"` on the
 * calendar so the rendered grid matches.
 */
export function fromDateInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return undefined;
  }
  return date;
}

export function roundMagnitude(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatMagnitude(value: number): string {
  return value.toFixed(1);
}

export function magnitudeCircleRadius(magnitude: number): number {
  let previous: readonly [number, number] = MAGNITUDE_RADIUS_STOPS[0];

  if (magnitude <= previous[0]) return previous[1];

  for (const current of MAGNITUDE_RADIUS_STOPS.slice(1)) {
    const [previousMagnitude, previousRadius] = previous;
    const [currentMagnitude, currentRadius] = current;

    if (magnitude <= currentMagnitude) {
      const progress = (magnitude - previousMagnitude) / (currentMagnitude - previousMagnitude);
      return previousRadius + progress * (currentRadius - previousRadius);
    }

    previous = current;
  }

  return previous[1];
}
