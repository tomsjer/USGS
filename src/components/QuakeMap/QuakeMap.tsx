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
  CLICK_ZOOM_DELTA,
  FIT_OPTIONS,
  INITIAL_VIEW_STATE,
  MAX_CLICK_ZOOM,
  MIN_CLICK_ZOOM,
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
import { quakeCircleLayer } from "@/map/config";
import {
  hoverPaint,
  selectedPaint,
  selectedRippleDelayPaint,
  selectedRipplePaint,
} from "@/map/highlightLayers";
import { useQuakesStore, useStatusStore, useViewportStore } from "@/stores";
import { type PopupInfo, QuakePopupContent } from "./QuakePopupContent";
import {
  boundsOf,
  countWithinBounds,
  disableRotation,
  featureId,
  type HighlightFeature,
  highlightFeature,
  highlightInfo,
  isSameHighlight,
  preciseCoords,
  type QuakeHighlight,
} from "./quakeMapUtils";

/** Only the quake circles are interactive (hover cursor + click → popup). */
const INTERACTIVE_LAYERS = [QUAKE_LAYER_ID];

/**
 * Dumb map renderer. Reads quake features from the store and feeds them to a
 * single GeoJSON source + data-driven circle layer (no clustering). Highlight
 * paint specs live in `map/highlightLayers`; pure helpers in `quakeMapUtils`.
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
        properties: {
          ...f.properties,
          [AGE_PROP]: (now - f.properties.time) / MS_PER_HOUR,
          // Carry precise coords in properties: a rendered feature's geometry is
          // quantized to the tile grid (drifts from the true point as you zoom),
          // but properties pass through exact — used to place the highlight/popup.
          lng: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
        },
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

  const hoverLayerPaint = useMemo(() => hoverPaint(pulse), [pulse]);
  const selectedLayerPaint = useMemo(() => selectedPaint(), []);
  const ripplePaint = useMemo(() => selectedRipplePaint(pulse), [pulse]);
  const rippleDelayPaint = useMemo(() => selectedRippleDelayPaint(pulse), [pulse]);

  // A new query is in flight → drop any open popup (applying a filter dismisses it).
  useEffect(() => {
    if (dataKind === "fetching") setSelected(null);
  }, [dataKind]);

  // Animate the hover/selection feedback (breathing ring + expanding ripples).
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
    const coords = feature ? preciseCoords(feature) : null;
    if (!feature || !coords) {
      setSelected(null);
      return;
    }
    const [longitude, latitude] = coords;
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
          paint={hoverLayerPaint}
        />
        <Layer
          id={QUAKE_SELECTED_RIPPLE_LAYER_ID}
          type="circle"
          source={QUAKE_HIGHLIGHT_SOURCE_ID}
          filter={["==", ["get", "variant"], "selected"]}
          paint={ripplePaint}
        />
        <Layer
          id={QUAKE_SELECTED_RIPPLE_DELAY_LAYER_ID}
          type="circle"
          source={QUAKE_HIGHLIGHT_SOURCE_ID}
          filter={["==", ["get", "variant"], "selected"]}
          paint={rippleDelayPaint}
        />
        <Layer
          id={QUAKE_SELECTED_LAYER_ID}
          type="circle"
          source={QUAKE_HIGHLIGHT_SOURCE_ID}
          filter={["==", ["get", "variant"], "selected"]}
          paint={selectedLayerPaint}
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
