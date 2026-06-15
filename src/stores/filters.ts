import { z } from "zod";
import { create } from "zustand";
import {
  DEFAULT_MAX_MAGNITUDE,
  DEFAULT_MIN_MAGNITUDE,
  DEFAULT_WINDOW_DAYS,
  MAX_MAGNITUDE,
  MIN_MAGNITUDE,
} from "@/lib/constants";
import { toUtcDateInput } from "@/lib/utils";

/**
 * Filter form domain + its Zod schema (the INPUT boundary). The form validates
 * against this on submit with zodResolver; only a valid form triggers a fetch.
 * Rules (AGENTS.md "Filter validation"): start ≤ end, magnitude numeric & in
 * range, no future dates.
 */

/** `YYYY-MM-DD` today, in UTC, for the no-future-dates bound. */
function todayUtc(): string {
  return toUtcDateInput(new Date());
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

export const filterSchema = z
  .object({
    starttime: dateString,
    endtime: dateString,
    minmagnitude: z
      .number({ message: "Magnitude must be a number" })
      .min(MIN_MAGNITUDE, `Magnitude ≥ ${MIN_MAGNITUDE}`)
      .max(MAX_MAGNITUDE, `Magnitude ≤ ${MAX_MAGNITUDE}`),
    maxmagnitude: z
      .number({ message: "Magnitude must be a number" })
      .min(MIN_MAGNITUDE, `Magnitude ≥ ${MIN_MAGNITUDE}`)
      .max(MAX_MAGNITUDE, `Magnitude ≤ ${MAX_MAGNITUDE}`),
  })
  .refine((f) => f.starttime <= f.endtime, {
    path: ["endtime"],
    message: "End date must be on or after the start date",
  })
  .refine((f) => f.endtime <= todayUtc(), {
    path: ["endtime"],
    message: "End date can't be in the future",
  })
  .refine((f) => f.starttime <= todayUtc(), {
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
