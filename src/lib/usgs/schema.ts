import { z } from "zod";

/**
 * Zod schemas for the USGS FDSNWS Event API GeoJSON response.
 *
 * `z.infer` of these schemas ARE the domain types — nothing downstream redefines
 * earthquake shapes. This module is framework-free: it imports nothing from React,
 * the store, or MapLibre.
 *
 * Field notes from the API (see AGENTS.md "Gotchas"):
 * - `mag` can be null (not every event has a computed magnitude).
 * - `place` can be null or empty.
 * - `time` / `updated` are Unix epoch milliseconds.
 * - geometry coordinates are `[longitude, latitude, depthKm]`.
 */

export const QuakeGeometrySchema = z.object({
  type: z.literal("Point"),
  // [lon, lat, depth] — depth may be absent on rare records, so keep it loose.
  coordinates: z.tuple([z.number(), z.number()]).rest(z.number()),
});

export const QuakePropertiesSchema = z.object({
  mag: z.number().nullable(),
  place: z.string().nullable(),
  time: z.number(),
  updated: z.number().nullable(),
  url: z.string().nullable(),
  tsunami: z.number().nullable(),
  type: z.string().nullable(),
});

export const QuakeFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.string(),
  properties: QuakePropertiesSchema,
  geometry: QuakeGeometrySchema,
});

export const QuakeFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  metadata: z
    .object({
      generated: z.number().optional(),
      title: z.string().optional(),
      count: z.number().optional(),
    })
    .loose(),
  features: z.array(QuakeFeatureSchema),
});

/** The domain type. One earthquake feature, validated. */
export type Earthquake = z.infer<typeof QuakeFeatureSchema>;
export type EarthquakeCollection = z.infer<typeof QuakeFeatureCollectionSchema>;
export type QuakeProperties = z.infer<typeof QuakePropertiesSchema>;
