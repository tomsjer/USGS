import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layer,
  Map as MapGL,
  type MapLayerMouseEvent,
  type MapRef,
  Popup,
  Source,
} from "react-map-gl/maplibre";
import {
  BASEMAP_STYLE_URL,
  FIT_OPTIONS,
  INITIAL_VIEW_STATE,
  POPUP_HEADROOM,
  QUAKE_LAYER_ID,
  QUAKE_SOURCE_ID,
} from "@/lib/constants";
import type { Earthquake } from "@/lib/usgs";
import { quakeCircleLayer } from "@/map/config";
import { useQuakesStore, useStatusStore } from "@/stores";

/** Only the quake circles are interactive (hover cursor + click → popup). */
const INTERACTIVE_LAYERS = [QUAKE_LAYER_ID];

/** Bounding box `[[w, s], [e, n]]` of the features, or null if empty. */
function boundsOf(features: Earthquake[]): [[number, number], [number, number]] | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return Number.isFinite(west)
    ? [
        [west, south],
        [east, north],
      ]
    : null;
}

/** What the popup renders — pulled straight off the clicked GL feature. */
interface PopupInfo {
  longitude: number;
  latitude: number;
  place: string | null;
  mag: number | null;
  time: number | null;
}

/**
 * Dumb map renderer. Reads quake features from the store and feeds them to a
 * single GeoJSON source + data-driven circle layer (no clustering).
 *
 * Interaction: clicking a circle centers the map on it and opens a popup (place,
 * magnitude, local time, close icon); clicking elsewhere on the map closes it.
 *
 * Drives two lifecycle hops:
 *  - map `load`  → map status `ready`
 *  - map `idle`  → data status `rendering → ready` once the source has painted.
 *
 * Stale-while-revalidate: during a fetch the prior points stay visible but dimmed.
 */
export function QuakeMap() {
  const items = useQuakesStore((s) => s.items);
  const setMap = useStatusStore((s) => s.setMap);
  const dataKind = useStatusStore((s) => s.data.kind);
  const mapReady = useStatusStore((s) => s.map.kind === "ready");

  const mapRef = useRef<MapRef>(null);
  const [selected, setSelected] = useState<PopupInfo | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const data = useMemo(() => ({ type: "FeatureCollection" as const, features: items }), [items]);

  // A new query is in flight → drop any open popup (applying a filter dismisses it).
  useEffect(() => {
    if (dataKind === "fetching") setSelected(null);
  }, [dataKind]);

  // New results landed → frame them. fitBounds shows the whole result set; runs once
  // the map is ready (so the initial query also gets framed on first load).
  useEffect(() => {
    if (!mapReady || items.length === 0) return;
    const bounds = boundsOf(items);
    if (bounds) mapRef.current?.fitBounds(bounds, FIT_OPTIONS);
  }, [items, mapReady]);

  // Esc closes the popup.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // After a source update we sit in `rendering`; MapLibre's first `idle` once the
  // new features have painted promotes us to `ready` with the live count.
  const onIdle = useCallback(() => {
    const { data: status, setData } = useStatusStore.getState();
    if (status.kind === "rendering") {
      setData({ kind: "ready", count: useQuakesStore.getState().items.length });
    }
  }, []);

  // Click a circle → select + center it; click empty map → close the popup.
  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.geometry.type !== "Point") {
      setSelected(null);
      return;
    }
    const [longitude, latitude] = feature.geometry.coordinates as [number, number];
    const props = feature.properties ?? {};
    setSelected({
      longitude,
      latitude,
      place: typeof props.place === "string" ? props.place : null,
      mag: typeof props.mag === "number" ? props.mag : null,
      time: typeof props.time === "number" ? props.time : null,
    });
    // Center the clicked point, biased downward so the popup above it has headroom
    // and stays in the viewport even for points near the top edge.
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      offset: [0, POPUP_HEADROOM / 2],
      duration: 600,
    });
  }, []);

  // Dim the existing points while a new query is in flight (stale-while-revalidate).
  const paint = useMemo(() => {
    const base = quakeCircleLayer.paint ?? {};
    return dataKind === "fetching" ? { ...base, "circle-opacity": 0.25 } : base;
  }, [dataKind]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={BASEMAP_STYLE_URL}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      cursor={cursor}
      onLoad={() => setMap({ kind: "ready" })}
      onIdle={onIdle}
      onClick={onClick}
      onMouseEnter={() => setCursor("pointer")}
      onMouseLeave={() => setCursor(undefined)}
      style={{ width: "100%", height: "100%" }}
    >
      <Source id={QUAKE_SOURCE_ID} type="geojson" data={data}>
        <Layer id={QUAKE_LAYER_ID} type="circle" source={QUAKE_SOURCE_ID} paint={paint} />
      </Source>

      {selected ? (
        <Popup
          longitude={selected.longitude}
          latitude={selected.latitude}
          anchor="bottom"
          offset={18}
          closeButton={false}
          closeOnClick={false}
          maxWidth="280px"
          onClose={() => setSelected(null)}
        >
          <QuakePopupContent info={selected} onClose={() => setSelected(null)} />
        </Popup>
      ) : null}
    </MapGL>
  );
}

function QuakePopupContent({ info, onClose }: { info: PopupInfo; onClose: () => void }) {
  const place = info.place?.trim() ? info.place : "Unknown location";
  const mag = info.mag === null ? "—" : info.mag.toFixed(1);
  const when =
    info.time === null
      ? "Unknown time"
      : new Date(info.time).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });

  return (
    <div className="flex min-w-44 flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-snug text-foreground">{place}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="-mr-1 -mt-1 rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <dt className="font-medium">Magnitude</dt>
        <dd className="text-foreground">{mag}</dd>
        <dt className="font-medium">Time</dt>
        <dd className="text-foreground">{when}</dd>
      </dl>
    </div>
  );
}
