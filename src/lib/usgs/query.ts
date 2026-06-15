import { USGS_API_URL } from "@/lib/constants";
import { type EarthquakeCollection, QuakeFeatureCollectionSchema } from "./schema";

/**
 * Framework-free USGS query layer. The ONLY place the USGS URL is constructed
 * (the base comes from `@/lib/constants`). Pure functions + a fetch that returns
 * a typed, Zod-validated result. Imports nothing from React, the store, or MapLibre.
 */

/** Validated filter inputs the query needs. Dates are `YYYY-MM-DD` (form-native). */
export interface QuakeQuery {
  starttime: string;
  endtime: string;
  minmagnitude: number;
  maxmagnitude: number;
}

/**
 * USGS treats `endtime=YYYY-MM-DD` as midnight UTC, which silently drops events
 * occurring later that day. Push the end date to the final millisecond of the
 * day in UTC so the whole day is included.
 */
export function endOfDayUtc(date: string): string {
  return `${date}T23:59:59.999Z`;
}

/** Start dates normalize to the first instant of the day in UTC. */
export function startOfDayUtc(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function buildQueryUrl(query: QuakeQuery): string {
  const params = new URLSearchParams({
    format: "geojson",
    starttime: startOfDayUtc(query.starttime),
    endtime: endOfDayUtc(query.endtime),
    minmagnitude: String(query.minmagnitude),
    maxmagnitude: String(query.maxmagnitude),
  });
  return `${USGS_API_URL}?${params.toString()}`;
}

/**
 * Fetch + validate earthquakes for the given filters. Carries an AbortSignal so
 * a superseded request can be cancelled — latest response wins. Throws on
 * network failure, non-OK status, or a response that fails schema validation;
 * callers map those to the `error` status.
 */
export async function fetchEarthquakes(
  query: QuakeQuery,
  signal?: AbortSignal,
): Promise<EarthquakeCollection> {
  const res = await fetch(buildQueryUrl(query), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`USGS request failed: ${res.status} ${res.statusText}`);
  }
  const json: unknown = await res.json();
  return QuakeFeatureCollectionSchema.parse(json);
}
