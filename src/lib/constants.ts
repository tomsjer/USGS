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
export const QUAKE_LAYER_ID = "quake-circles";
/** Fallback for the nullable `mag` field so paint expressions never see null. */
export const DEFAULT_MAG = 0;
/** Initial camera — whole world. */
export const INITIAL_VIEW_STATE = { longitude: 0, latitude: 20, zoom: 1.4 } as const;

// Filter bounds + defaults
export const MIN_MAGNITUDE = -1;
export const MAX_MAGNITUDE = 10;
export const DEFAULT_MIN_MAGNITUDE = 2.5;
export const DEFAULT_WINDOW_DAYS = 30;
