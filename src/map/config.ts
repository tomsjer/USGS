import type { CircleLayerSpecification, ExpressionSpecification } from "maplibre-gl";

/**
 * Single source of truth for the MapLibre setup: basemap, the one GeoJSON source,
 * and the data-driven circle layer. NO clustering — per-point magnitude sizing and
 * per-point popups need individual features (AGENTS.md "Don't").
 */

/** OpenFreeMap — free, keyless basemap. Pinned here. */
export const BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/** The id of the lone GeoJSON source the quake features feed into. */
export const QUAKE_SOURCE_ID = "quakes";

/** The id of the circle layer rendered from that source. */
export const QUAKE_LAYER_ID = "quake-circles";

/** Default for the nullable `mag` field so paint expressions never see null. */
export const DEFAULT_MAG = 0;

/** Initial camera — whole world. */
export const INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 20,
  zoom: 1.4,
} as const;

/**
 * Circle radius and color interpolate on `mag`. `mag` is nullable in USGS data,
 * so we coalesce a default via `["coalesce", ["get", "mag"], DEFAULT_MAG]`.
 */
const magExpr: ExpressionSpecification = ["coalesce", ["get", "mag"], DEFAULT_MAG];

export const quakeCircleLayer: CircleLayerSpecification = {
  id: QUAKE_LAYER_ID,
  type: "circle",
  source: QUAKE_SOURCE_ID,
  paint: {
    "circle-radius": ["interpolate", ["linear"], magExpr, 0, 3, 2, 5, 4, 9, 6, 16, 8, 26],
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
