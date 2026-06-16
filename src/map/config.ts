import type { CircleLayerSpecification, ExpressionSpecification } from "maplibre-gl";
import {
  AGE_COLORS,
  AGE_PROP,
  DEFAULT_MAG,
  MAGNITUDE_RADIUS_STOPS,
  QUAKE_LAYER_ID,
  QUAKE_SOURCE_ID,
} from "@/lib/constants";

/**
 * The MapLibre circle-layer spec (paint expressions). Scalar constants (basemap
 * URL, source/layer ids, default mag, initial view) live in `@/lib/constants`;
 * this module owns the structured layer/paint definition. NO clustering —
 * per-point magnitude sizing and per-point popups need individual features.
 */

/**
 * Circle radius interpolates on `mag` (nullable in USGS data, so we coalesce a
 * default via `["coalesce", ["get", "mag"], DEFAULT_MAG]`). Color is independent:
 * it encodes event age, not magnitude (see `circleColor`).
 */
const magExpr: ExpressionSpecification = ["coalesce", ["get", "mag"], DEFAULT_MAG];
const radiusStops = MAGNITUDE_RADIUS_STOPS.flat();
const circleRadius: ExpressionSpecification = ["interpolate", ["linear"], magExpr, ...radiusStops];

/**
 * Color by age bucket: a `step` over the injected `ageHours` property, built from
 * `AGE_COLORS` so the map and legend never drift. The first color applies below
 * the first boundary; each subsequent boundary is the previous bucket's `maxHours`
 * (the open-ended "Older" bucket's `Infinity` is never a boundary).
 */
const ageColorStops: (number | string)[] = [];
for (let i = 1; i < AGE_COLORS.length; i++) {
  const prev = AGE_COLORS[i - 1];
  const bucket = AGE_COLORS[i];
  if (prev && bucket) ageColorStops.push(prev.maxHours, bucket.color);
}
const circleColor: ExpressionSpecification = [
  "step",
  ["get", AGE_PROP],
  AGE_COLORS[0].color,
  ...ageColorStops,
] as ExpressionSpecification;

export const quakeCircleLayer: CircleLayerSpecification = {
  id: QUAKE_LAYER_ID,
  type: "circle",
  source: QUAKE_SOURCE_ID,
  paint: {
    "circle-radius": circleRadius,
    "circle-color": circleColor,
    "circle-opacity": 0.8,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-opacity": 0.6,
  },
};
