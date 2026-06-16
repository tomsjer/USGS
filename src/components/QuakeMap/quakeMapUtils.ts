import type { MapGeoJSONFeature, Map as MapInstance } from "maplibre-gl";
import type { MapRef } from "react-map-gl/maplibre";
import { DEFAULT_MAG } from "@/lib/constants";
import type { Earthquake } from "@/lib/usgs";
import { magnitudeCircleRadius } from "@/lib/utils";

/** Pure helpers + types behind QuakeMap. Keeps the component a thin renderer. */

export type HighlightVariant = "hover" | "selected";

/** A point to spotlight on the map (hover or selection), with precise coords. */
export interface QuakeHighlight {
  id: string | number | null;
  longitude: number;
  latitude: number;
  mag: number | null;
}

/** GeoJSON feature fed to the highlight source; `radius` matches the map circle. */
export interface HighlightFeature {
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

export function featureId(feature: MapGeoJSONFeature | undefined): string | number | null {
  const id = feature?.id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

/**
 * Exact `[lng, lat]` of a clicked/hovered feature. Prefers the precise coords we
 * stash in properties over `geometry.coordinates`, which MapLibre quantizes to
 * the tile grid (the quantized value drifts visibly from the true point on zoom).
 */
export function preciseCoords(feature: MapGeoJSONFeature): [number, number] | null {
  if (feature.geometry.type !== "Point") return null;
  const props = feature.properties ?? {};
  const [fallbackLng, fallbackLat] = feature.geometry.coordinates as [number, number];
  return [
    typeof props.lng === "number" ? props.lng : fallbackLng,
    typeof props.lat === "number" ? props.lat : fallbackLat,
  ];
}

export function highlightInfo(feature: MapGeoJSONFeature | undefined): QuakeHighlight | null {
  if (!feature) return null;
  const coords = preciseCoords(feature);
  if (!coords) return null;
  const props = feature.properties ?? {};
  return {
    id: featureId(feature),
    longitude: coords[0],
    latitude: coords[1],
    mag: typeof props.mag === "number" ? props.mag : null,
  };
}

export function isSameHighlight(a: QuakeHighlight | null, b: QuakeHighlight | null): boolean {
  if (!a || !b) return false;
  if (a.id !== null && b.id !== null) return a.id === b.id;
  return a.longitude === b.longitude && a.latitude === b.latitude;
}

export function highlightFeature(
  highlight: QuakeHighlight,
  variant: HighlightVariant,
): HighlightFeature {
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

/** The basemap is 2D-only; lock out rotation/pitch gestures so north stays up. */
export function disableRotation(map: MapInstance): void {
  map.dragRotate.disable();
  map.touchPitch.disable();
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
}

/** How many features fall within the current map bounds. */
export function countWithinBounds(features: Earthquake[], map: MapRef): number {
  const bounds = map.getBounds();
  let count = 0;
  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    if (bounds.contains([lng, lat])) count += 1;
  }
  return count;
}

/** Bounding box `[[w, s], [e, n]]` of the features, or null if empty. */
export function boundsOf(features: Earthquake[]): [[number, number], [number, number]] | null {
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
