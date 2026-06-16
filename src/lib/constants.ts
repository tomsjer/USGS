/**
 * Single source of truth for app constants. Don't scatter magic values inline —
 * add them here. External service URLs are env-overridable (`VITE_*`, typed in
 * `vite-env.d.ts`) with a safe default so a fresh clone / prod build runs without
 * a `.env`; document new vars in `.env.example`.
 *
 * Reads only `import.meta.env` — no React / store / MapLibre imports — so the
 * framework-free `src/lib/usgs` seam may import from here.
 */

// External services
export const USGS_API_URL =
  import.meta.env.VITE_USGS_API_URL ?? "https://earthquake.usgs.gov/fdsnws/event/1/query";
export const BASEMAP_STYLE_URL =
  import.meta.env.VITE_BASEMAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

// Map layer identity + rendering defaults
export const QUAKE_SOURCE_ID = "quakes";
export const QUAKE_HIGHLIGHT_SOURCE_ID = "quake-highlights";
export const QUAKE_LAYER_ID = "quake-circles";
export const QUAKE_HOVER_LAYER_ID = "quake-hover";
export const QUAKE_SELECTED_LAYER_ID = "quake-selected";
export const QUAKE_SELECTED_RIPPLE_LAYER_ID = "quake-selected-ripple";
export const QUAKE_SELECTED_RIPPLE_DELAY_LAYER_ID = "quake-selected-ripple-delay";
/** Fallback for the nullable `mag` field so paint expressions never see null. */
export const DEFAULT_MAG = 0;
export const MAGNITUDE_RADIUS_STOPS = [
  [0, 3],
  [2, 5],
  [4, 9],
  [6, 16],
  [8, 26],
] as const;
/**
 * Circle color encodes event age (radius already encodes magnitude). Warm =
 * recent → cool = old. Single source of truth for both the map's `step` color
 * expression and the legend. `maxHours` of every bucket but the last are the
 * step boundaries; `Infinity` marks the open-ended "Older" bucket (legend only).
 */
export const AGE_COLORS = [
  { label: "Past hour", maxHours: 1, color: "#d73027" }, // red
  { label: "Past day", maxHours: 24, color: "#fc8d59" }, // orange
  { label: "Past week", maxHours: 168, color: "#fee090" }, // yellow
  { label: "Past month", maxHours: 720, color: "#91cf60" }, // green
  { label: "Past year", maxHours: 8760, color: "#4393c3" }, // blue
  { label: "Older", maxHours: Number.POSITIVE_INFINITY, color: "#5e4fa2" }, // purple
] as const;
/** Feature property (hours since the event) the age color expression reads. */
export const AGE_PROP = "ageHours";
/** Milliseconds per hour — used to derive ages and age-bucket date presets. */
export const MS_PER_HOUR = 3_600_000;
/** Initial camera — whole world. */
export const INITIAL_VIEW_STATE = { longitude: 0, latitude: 20, zoom: 1.4 } as const;
/** Vertical pixel headroom kept above a clicked point so its popup never clips. */
export const POPUP_HEADROOM = 90;
/** How a result set is framed when a new query lands (MapLibre `fitBounds` options). */
export const FIT_OPTIONS = { padding: 48, maxZoom: 8, duration: 800 } as const;
/** Clicking a quake zooms in by this many levels, clamped to [min, max], to separate overlaps. */
export const CLICK_ZOOM_DELTA = 1.5;
export const MIN_CLICK_ZOOM = 5.5;
export const MAX_CLICK_ZOOM = 8;

// Filter bounds + defaults
export const MIN_MAGNITUDE = -1;
export const MAX_MAGNITUDE = 10;
export const DEFAULT_MIN_MAGNITUDE = 2.5;
export const DEFAULT_MAX_MAGNITUDE = MAX_MAGNITUDE;
export const DEFAULT_WINDOW_DAYS = 30;
