import { useCallback, useMemo } from "react";
import { Layer, Map as MapGL, Source } from "react-map-gl/maplibre";
import {
  BASEMAP_STYLE_URL,
  INITIAL_VIEW_STATE,
  QUAKE_LAYER_ID,
  QUAKE_SOURCE_ID,
} from "@/lib/constants";
import { quakeCircleLayer } from "@/map/config";
import { useQuakesStore, useStatusStore } from "@/stores";

/**
 * Dumb map renderer. Reads quake features from the store and feeds them to a
 * single GeoJSON source + data-driven circle layer (no clustering).
 *
 * Drives two lifecycle hops:
 *  - map `load`  → map status `ready`
 *  - map `idle`  → data status `rendering → ready` once the source has painted
 *    (AGENTS.md: the rendering→ready step is the `idle` event, not a guess).
 *
 * Stale-while-revalidate: during a fetch the prior points stay visible but dimmed
 * — the map is never blanked.
 */
export function QuakeMap() {
  const items = useQuakesStore((s) => s.items);
  const setMap = useStatusStore((s) => s.setMap);
  const dataKind = useStatusStore((s) => s.data.kind);

  const data = useMemo(() => ({ type: "FeatureCollection" as const, features: items }), [items]);

  // After a source update we sit in `rendering`; MapLibre's first `idle` once the
  // new features have painted promotes us to `ready` with the live count.
  const onIdle = useCallback(() => {
    const { data: status, setData } = useStatusStore.getState();
    if (status.kind === "rendering") {
      setData({ kind: "ready", count: useQuakesStore.getState().items.length });
    }
  }, []);

  // Dim the existing points while a new query is in flight (stale-while-revalidate).
  const paint = useMemo(() => {
    const base = quakeCircleLayer.paint ?? {};
    return dataKind === "fetching" ? { ...base, "circle-opacity": 0.25 } : base;
  }, [dataKind]);

  return (
    <MapGL
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={BASEMAP_STYLE_URL}
      onLoad={() => setMap({ kind: "ready" })}
      onIdle={onIdle}
      style={{ width: "100%", height: "100%" }}
    >
      <Source id={QUAKE_SOURCE_ID} type="geojson" data={data}>
        <Layer id={QUAKE_LAYER_ID} type="circle" source={QUAKE_SOURCE_ID} paint={paint} />
      </Source>
    </MapGL>
  );
}
