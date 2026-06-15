import type { FilterSpecification, MapGeoJSONFeature, Map as MapInstance } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layer,
  Map as MapGL,
  type MapLayerMouseEvent,
  type MapRef,
  Popup,
  ScaleControl,
  Source,
} from "react-map-gl/maplibre";
import {
  AGE_PROP,
  BASEMAP_STYLE_URL,
  FIT_OPTIONS,
  INITIAL_VIEW_STATE,
  POPUP_HEADROOM,
  QUAKE_LAYER_ID,
  QUAKE_SOURCE_ID,
} from "@/lib/constants";
import type { Earthquake } from "@/lib/usgs";
import { quakeCircleLayer, quakeHoverLayer, quakeSelectedLayer } from "@/map/config";
import { useQuakesStore, useStatusStore, useViewportStore } from "@/stores";
import { type PopupInfo, QuakePopupContent } from "./QuakePopupContent";

/** Only the quake circles are interactive (hover cursor + click → popup). */
const INTERACTIVE_LAYERS = [QUAKE_LAYER_ID];
const EMPTY_FEATURE_FILTER: FilterSpecification = ["==", ["id"], ""];

function idFilter(id: string | number | null | undefined): FilterSpecification {
  return id === null || id === undefined ? EMPTY_FEATURE_FILTER : ["==", ["id"], id];
}

function featureId(feature: MapGeoJSONFeature | undefined): string | number | null {
  const id = feature?.id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

function disableRotation(map: MapInstance): void {
  map.dragRotate.disable();
  map.touchPitch.disable();
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
}

/** How many features fall within the current map bounds. */
function countWithinBounds(features: Earthquake[], map: MapRef): number {
  const bounds = map.getBounds();
  let count = 0;
  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    if (bounds.contains([lng, lat])) count += 1;
  }
  return count;
}

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
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Inject `ageHours` (relative to load time) so the circle-color step expression
  // can read it — MapLibre paint can't compute "now" itself. Recomputed per result set.
  const data = useMemo(() => {
    const now = Date.now();
    return {
      type: "FeatureCollection" as const,
      features: items.map((f) => ({
        ...f,
        properties: { ...f.properties, [AGE_PROP]: (now - f.properties.time) / 3_600_000 },
      })),
    };
  }, [items]);
  const hoverFilter = useMemo(() => idFilter(hoveredId), [hoveredId]);
  const selectedFilter = useMemo(() => idFilter(selected?.id), [selected?.id]);

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

  // Recompute how many loaded points are within the current bounds (drives the
  // `visible / total` count in the status pill).
  const updateVisible = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    useViewportStore.getState().setVisible(countWithinBounds(useQuakesStore.getState().items, map));
  }, []);

  // After a source update we sit in `rendering`; MapLibre's first `idle` once the
  // new features have painted promotes us to `ready` with the live count.
  const onIdle = useCallback(() => {
    const { data: status, setData } = useStatusStore.getState();
    if (status.kind === "rendering") {
      setData({ kind: "ready", count: useQuakesStore.getState().items.length });
    }
    updateVisible();
  }, [updateVisible]);

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
      id: featureId(feature),
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

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const id = featureId(e.features?.[0]);
    setHoveredId(id);
    setCursor(id === null ? undefined : "pointer");
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
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      cursor={cursor}
      onLoad={(event) => {
        disableRotation(event.target);
        setMap({ kind: "ready" });
      }}
      onIdle={onIdle}
      onMoveEnd={updateVisible}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={() => {
        setHoveredId(null);
        setCursor(undefined);
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <Source id={QUAKE_SOURCE_ID} type="geojson" data={data}>
        <Layer id={QUAKE_LAYER_ID} type="circle" source={QUAKE_SOURCE_ID} paint={paint} />
        <Layer {...quakeHoverLayer} filter={hoverFilter} />
        <Layer {...quakeSelectedLayer} filter={selectedFilter} />
      </Source>
      <ScaleControl position="bottom-left" maxWidth={96} unit="metric" />

      {selected ? (
        <Popup
          longitude={selected.longitude}
          latitude={selected.latitude}
          anchor="bottom"
          offset={18}
          closeButton={false}
          closeOnClick={false}
          maxWidth="240px"
          onClose={() => setSelected(null)}
        >
          <QuakePopupContent info={selected} onClose={() => setSelected(null)} />
        </Popup>
      ) : null}
    </MapGL>
  );
}
