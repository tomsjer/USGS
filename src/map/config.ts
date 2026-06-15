import type { CircleLayerSpecification, ExpressionSpecification } from "maplibre-gl";
import {
  DEFAULT_MAG,
  MAGNITUDE_RADIUS_STOPS,
  QUAKE_HOVER_LAYER_ID,
  QUAKE_LAYER_ID,
  QUAKE_SELECTED_LAYER_ID,
  QUAKE_SOURCE_ID,
} from "@/lib/constants";

/**
 * The MapLibre circle-layer spec (paint expressions). Scalar constants (basemap
 * URL, source/layer ids, default mag, initial view) live in `@/lib/constants`;
 * this module owns the structured layer/paint definition. NO clustering —
 * per-point magnitude sizing and per-point popups need individual features.
 */

/**
 * Circle radius and color interpolate on `mag`. `mag` is nullable in USGS data,
 * so we coalesce a default via `["coalesce", ["get", "mag"], DEFAULT_MAG]`.
 */
const magExpr: ExpressionSpecification = ["coalesce", ["get", "mag"], DEFAULT_MAG];
const radiusStops = MAGNITUDE_RADIUS_STOPS.flat();
const circleRadius: ExpressionSpecification = ["interpolate", ["linear"], magExpr, ...radiusStops];

export const quakeCircleLayer: CircleLayerSpecification = {
  id: QUAKE_LAYER_ID,
  type: "circle",
  source: QUAKE_SOURCE_ID,
  paint: {
    "circle-radius": circleRadius,
    "circle-color": [
      "interpolate",
      ["linear"],
      magExpr,
      0,
      "#2c7fb8",
      2.5,
      "#41b6c4",
      4.5,
      "#fecc5c",
      6,
      "#fd8d3c",
      7.5,
      "#e31a1c",
    ],
    "circle-opacity": 0.8,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-opacity": 0.6,
  },
};

export const quakeHoverLayer: CircleLayerSpecification = {
  id: QUAKE_HOVER_LAYER_ID,
  type: "circle",
  source: QUAKE_SOURCE_ID,
  paint: {
    "circle-radius": ["+", circleRadius, 2],
    "circle-color": "rgba(255,255,255,0.08)",
    "circle-stroke-width": 2,
    "circle-stroke-color": "#111827",
    "circle-stroke-opacity": 0.5,
  },
};

export const quakeSelectedLayer: CircleLayerSpecification = {
  id: QUAKE_SELECTED_LAYER_ID,
  type: "circle",
  source: QUAKE_SOURCE_ID,
  paint: {
    "circle-radius": ["+", circleRadius, 4],
    "circle-color": "rgba(255,255,255,0.14)",
    "circle-stroke-width": 2.5,
    "circle-stroke-color": "#111827",
    "circle-stroke-opacity": 0.8,
  },
};
