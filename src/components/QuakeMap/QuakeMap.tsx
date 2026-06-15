import { useMemo } from "react";
import { Layer, Map as MapGL, Source } from "react-map-gl/maplibre";
import {
  BASEMAP_STYLE_URL,
  INITIAL_VIEW_STATE,
  QUAKE_SOURCE_ID,
  quakeCircleLayer,
} from "@/map/config";
import { useQuakesStore, useStatusStore } from "@/stores";

/**
 * Dumb map renderer. Reads quake features from the store and feeds them to a
 * single GeoJSON source + data-driven circle layer (no clustering). On MapLibre's
 * `load` event it flips the map lifecycle to `ready`.
 *
 * NOTE: stub. Click→popup, the `rendering → ready` `idle`-event step, and
 * stale-while-revalidate dimming attach here in follow-up steps.
 */
export function QuakeMap() {
  const items = useQuakesStore((s) => s.items);
  const setMap = useStatusStore((s) => s.setMap);

  const data = useMemo(() => ({ type: "FeatureCollection" as const, features: items }), [items]);

  return (
    <MapGL
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={BASEMAP_STYLE_URL}
      onLoad={() => setMap({ kind: "ready" })}
      style={{ width: "100%", height: "100%" }}
    >
      <Source id={QUAKE_SOURCE_ID} type="geojson" data={data}>
        <Layer {...quakeCircleLayer} />
      </Source>
    </MapGL>
  );
}
