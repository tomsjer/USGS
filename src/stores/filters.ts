import { z } from "zod";
import { create } from "zustand";
import {
  DEFAULT_MAX_MAGNITUDE,
  DEFAULT_MIN_MAGNITUDE,
  DEFAULT_WINDOW_DAYS,
  MAX_MAGNITUDE,
  MIN_MAGNITUDE,
} from "@/lib/constants";
import { endOfDayUtc, startOfDayUtc } from "@/lib/usgs";
import { toUtcDateInput } from "@/lib/utils";

/**
 * Filter form domain + its Zod schema (the INPUT boundary). The form validates
 * against this on submit with zodResolver; only a valid form triggers a fetch.
 * Rules (AGENTS.md "Filter validation"): start ≤ end, magnitude numeric & in
 * range, no future dates.
 *
 * A field is normally a `YYYY-MM-DD` day, but a preset may set a full ISO instant
 * (e.g. "Past hour" → exact `now−1h … now`). Ordering/future checks therefore
 * compare resolved instants, not strings: a bare date resolves to start- or
 * end-of-day in UTC; an ISO value is used as-is.
 */

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/, "Use a YYYY-MM-DD date");

/** Earliest instant a value can mean (bare date → its UTC midnight; ISO → exact). */
function startInstant(value: string): number {
  return Date.parse(startOfDayUtc(value));
}

/** Latest instant a value can mean (bare date → its UTC end-of-day; ISO → exact). */
function endInstant(value: string): number {
  return Date.parse(endOfDayUtc(value));
}

export const filterSchema = z
  .object({
    starttime: dateField,
    endtime: dateField,
    minmagnitude: z
      .number({ message: "Magnitude must be a number" })
      .min(MIN_MAGNITUDE, `Magnitude ≥ ${MIN_MAGNITUDE}`)
      .max(MAX_MAGNITUDE, `Magnitude ≤ ${MAX_MAGNITUDE}`),
    maxmagnitude: z
      .number({ message: "Magnitude must be a number" })
      .min(MIN_MAGNITUDE, `Magnitude ≥ ${MIN_MAGNITUDE}`)
      .max(MAX_MAGNITUDE, `Magnitude ≤ ${MAX_MAGNITUDE}`),
  })
  .refine((f) => startInstant(f.starttime) <= endInstant(f.endtime), {
    path: ["endtime"],
    message: "End date must be on or after the start date",
  })
  // Judge "no future" at the earliest instant, so a bare end date of *today* (its
  // midnight) is allowed while an ISO instant is held to the exact clock time.
  .refine((f) => startInstant(f.endtime) <= Date.now(), {
    path: ["endtime"],
    message: "End date can't be in the future",
  })
  .refine((f) => startInstant(f.starttime) <= Date.now(), {
    path: ["starttime"],
    message: "Start date can't be in the future",
  })
  .refine((f) => f.minmagnitude <= f.maxmagnitude, {
    path: ["maxmagnitude"],
    message: "Maximum magnitude must be at least the minimum",
  });

export type FilterValues = z.infer<typeof filterSchema>;

/** Default window: the last `DEFAULT_WINDOW_DAYS` days, magnitude ≥ `DEFAULT_MIN_MAGNITUDE`. */
export function defaultFilters(): FilterValues {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - DEFAULT_WINDOW_DAYS);
  return {
    starttime: toUtcDateInput(start),
    endtime: toUtcDateInput(end),
    minmagnitude: DEFAULT_MIN_MAGNITUDE,
    maxmagnitude: DEFAULT_MAX_MAGNITUDE,
  };
}

interface FiltersState {
  /** Last submitted (valid) filters that drive the active query. */
  applied: FilterValues;
  setApplied: (filters: FilterValues) => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  applied: defaultFilters(),
  setApplied: (applied) => set({ applied }),
}));
