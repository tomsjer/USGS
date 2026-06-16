import type { CircleLayerSpecification, MapGeoJSONFeature, Map as MapInstance } from "maplibre-gl";
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
  DEFAULT_MAG,
  FIT_OPTIONS,
  INITIAL_VIEW_STATE,
  MS_PER_HOUR,
  POPUP_HEADROOM,
  QUAKE_HIGHLIGHT_SOURCE_ID,
  QUAKE_HOVER_LAYER_ID,
  QUAKE_LAYER_ID,
  QUAKE_SELECTED_LAYER_ID,
  QUAKE_SELECTED_RIPPLE_DELAY_LAYER_ID,
  QUAKE_SELECTED_RIPPLE_LAYER_ID,
  QUAKE_SOURCE_ID,
} from "@/lib/constants";
import type { Earthquake } from "@/lib/usgs";
import { magnitudeCircleRadius } from "@/lib/utils";
import { quakeCircleLayer } from "@/map/config";
import { useQuakesStore, useStatusStore, useViewportStore } from "@/stores";
import { type PopupInfo, QuakePopupContent } from "./QuakePopupContent";

/** Only the quake circles are interactive (hover cursor + click → popup). */
const INTERACTIVE_LAYERS = [QUAKE_LAYER_ID];
const MIN_CLICK_ZOOM = 5.5;
const MAX_CLICK_ZOOM = 8;
const CLICK_ZOOM_DELTA = 1.5;

type HighlightVariant = "hover" | "selected";

interface QuakeHighlight {
  id: string | number | null;
  longitude: number;
  latitude: number;
  mag: number | null;
}

interface HighlightFeature {
  type: "Feature";
  id: string;
  properties: {
    variant: HighlightVariant;
    radius: number;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

function featureId(feature: MapGeoJSONFeature | undefined): string | number | null {
  const id = feature?.id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

function highlightInfo(feature: MapGeoJSONFeature | undefined): QuakeHighlight | null {
  if (feature?.geometry.type !== "Point") return null;
  const [longitude, latitude] = feature.geometry.coordinates as [number, number];
  const props = feature.properties ?? {};
  return {
    id: featureId(feature),
    longitude,
    latitude,
    mag: typeof props.mag === "number" ? props.mag : null,
  };
}

function isSameHighlight(a: QuakeHighlight | null, b: QuakeHighlight | null): boolean {
  if (!a || !b) return false;
  if (a.id !== null && b.id !== null) return a.id === b.id;
  return a.longitude === b.longitude && a.latitude === b.latitude;
}

function highlightFeature(highlight: QuakeHighlight, variant: HighlightVariant): HighlightFeature {
  const featureIdPart = highlight.id ?? `${highlight.longitude},${highlight.latitude}`;
  return {
    type: "Feature",
    id: `${variant}-${featureIdPart}`,
    properties: {
      variant,
      radius: magnitudeCircleRadius(highlight.mag ?? DEFAULT_MAG),
    },
    geometry: {
      type: "Point",
      coordinates: [highlight.longitude, highlight.latitude],
    },
  };
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
  const [hovered, setHovered] = useState<QuakeHighlight | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pulse, setPulse] = useState(0);

  // Inject `ageHours` (relative to load time) so the circle-color step expression
  // can read it — MapLibre paint can't compute "now" itself. Recomputed per result set.
  const data = useMemo(() => {
    const now = Date.now();
    return {
      type: "FeatureCollection" as const,
      features: items.map((f) => ({
        ...f,
        properties: { ...f.properties, [AGE_PROP]: (now - f.properties.time) / MS_PER_HOUR },
      })),
    };
  }, [items]);
  const highlightData = useMemo(() => {
    const features: HighlightFeature[] = [];
    if (hovered && !isSameHighlight(hovered, selected)) {
      features.push(highlightFeature(hovered, "hover"));
    }
    if (selected) {
      features.push(highlightFeature(selected, "selected"));
    }
    return { type: "FeatureCollection" as const, features };
  }, [hovered, selected]);

  const hoverPaint = useMemo<CircleLayerSpecification["paint"]>(
    () => ({
      "circle-radius": ["+", ["get", "radius"], 4 + Math.sin(pulse * Math.PI * 2) * 1.5],
      "circle-color": "rgba(255,255,255,0.12)",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#111827",
      "circle-stroke-opacity": 0.68,
    }),
    [pulse],
  );

  const selectedPaint = useMemo<CircleLayerSpecification["paint"]>(
    () => ({
      "circle-radius": ["+", ["get", "radius"], 4],
      "circle-color": "rgba(220,38,38,0.16)",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#dc2626",
      "circle-stroke-opacity": 0.95,
    }),
    [],
  );

  const selectedRipplePaint = useMemo<CircleLayerSpecification["paint"]>(() => {
    const radius = 8 + pulse * 17;
    const opacity = Math.max(0, 0.68 * (1 - pulse));
    return {
      "circle-radius": ["+", ["get", "radius"], radius],
      "circle-color": "rgba(220,38,38,0)",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#dc2626",
      "circle-stroke-opacity": opacity,
    };
  }, [pulse]);

  const selectedRippleDelayPaint = useMemo<CircleLayerSpecification["paint"]>(() => {
    const delayedPulse = (pulse + 0.48) % 1;
    const radius = 8 + delayedPulse * 17;
    const opacity = Math.max(0, 0.52 * (1 - delayedPulse));
    return {
      "circle-radius": ["+", ["get", "radius"], radius],
      "circle-color": "rgba(220,38,38,0)",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#f87171",
      "circle-stroke-opacity": opacity,
    };
  }, [pulse]);

  // A new query is in flight → drop any open popup (applying a filter dismisses it).
  useEffect(() => {
    if (dataKind === "fetching") setSelected(null);
  }, [dataKind]);

  useEffect(() => {
    if (!hovered && !selected) {
      setPulse(0);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      setPulse(((now - startedAt) % 1800) / 1800);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hovered, selected]);

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
    const map = mapRef.current;
    const zoom = map
      ? Math.min(Math.max(map.getZoom() + CLICK_ZOOM_DELTA, MIN_CLICK_ZOOM), MAX_CLICK_ZOOM)
      : MIN_CLICK_ZOOM;
    // Center and zoom the clicked point so nearby overlaps become easier to separate.
    map?.flyTo({
      center: [longitude, latitude],
      zoom,
      offset: [0, POPUP_HEADROOM / 2],
      duration: 600,
    });
  }, []);

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const highlight = highlightInfo(e.features?.[0]);
    setHovered(highlight);
    setCursor(highlight ? "pointer" : undefined);
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
        setHovered(null);
        setCursor(undefined);
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <Source id={QUAKE_SOURCE_ID} type="geojson" data={data}>
        <Layer id={QUAKE_LAYER_ID} type="circle" source={QUAKE_SOURCE_ID} paint={paint} />
      </Source>
      <Source id={QUAKE_HIGHLIGHT_SOURCE_ID} type="geojson" data={highlightData}>
        <Layer
          id={QUAKE_HOVER_LAYER_ID}
          type="circle"
          source={QUAKE_HIGHLIGHT_SOURCE_ID}
          filter={["==", ["get", "variant"], "hover"]}
          paint={hoverPaint}
        />
        <Layer
          id={QUAKE_SELECTED_RIPPLE_LAYER_ID}
          type="circle"
          source={QUAKE_HIGHLIGHT_SOURCE_ID}
          filter={["==", ["get", "variant"], "selected"]}
          paint={selectedRipplePaint}
        />
        <Layer
          id={QUAKE_SELECTED_RIPPLE_DELAY_LAYER_ID}
          type="circle"
          source={QUAKE_HIGHLIGHT_SOURCE_ID}
          filter={["==", ["get", "variant"], "selected"]}
          paint={selectedRippleDelayPaint}
        />
        <Layer
          id={QUAKE_SELECTED_LAYER_ID}
          type="circle"
          source={QUAKE_HIGHLIGHT_SOURCE_ID}
          filter={["==", ["get", "variant"], "selected"]}
          paint={selectedPaint}
        />
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
