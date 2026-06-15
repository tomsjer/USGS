/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** USGS FDSNWS event query endpoint. Defaults in `@/lib/constants`. */
  readonly VITE_USGS_API_URL?: string;
  /** MapLibre basemap style URL. Defaults in `@/lib/constants`. */
  readonly VITE_BASEMAP_STYLE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
