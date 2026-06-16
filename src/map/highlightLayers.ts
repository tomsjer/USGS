import type { CircleLayerSpecification } from "maplibre-gl";

/**
 * Paint builders for the hover/selected highlight layers (one GeoJSON source,
 * per-variant circle layers — see QuakeMap). Kept here with the other MapLibre
 * paint specs (`map/config.ts`). `pulse` is the 0→1 animation phase that drives
 * the breathing hover ring and the expanding selection ripples.
 *
 * Selection uses cyan as a softer accent than the previous red. The expanding
 * "radius" terms are added to each feature's base `radius` property so the ring
 * always hugs the underlying magnitude-sized circle.
 */
type CirclePaint = CircleLayerSpecification["paint"];

/** Selection accent — cyan reads as a highlight without feeling as harsh as red. */
const SELECTED_COLOR = "#06b6d4"; // cyan-500
const SELECTED_FILL = "rgba(6,182,212,0.18)";
/** Trailing ripple uses a lighter cyan so the two ripples read as distinct waves. */
const RIPPLE_DELAY_COLOR = "#67e8f9"; // cyan-300

export function hoverPaint(pulse: number): CirclePaint {
  return {
    "circle-radius": ["+", ["get", "radius"], 4 + Math.sin(pulse * Math.PI * 2) * 1.5],
    "circle-color": "rgba(255,255,255,0.12)",
    "circle-stroke-width": 2,
    "circle-stroke-color": "#111827",
    "circle-stroke-opacity": 0.68,
  };
}

export function selectedPaint(): CirclePaint {
  return {
    "circle-radius": ["+", ["get", "radius"], 4],
    "circle-color": SELECTED_FILL,
    "circle-stroke-width": 2,
    "circle-stroke-color": SELECTED_COLOR,
    "circle-stroke-opacity": 0.95,
  };
}

export function selectedRipplePaint(pulse: number): CirclePaint {
  const radius = 8 + pulse * 17;
  return {
    "circle-radius": ["+", ["get", "radius"], radius],
    "circle-color": "rgba(6,182,212,0)",
    "circle-stroke-width": 2,
    "circle-stroke-color": SELECTED_COLOR,
    "circle-stroke-opacity": Math.max(0, 0.68 * (1 - pulse)),
  };
}

export function selectedRippleDelayPaint(pulse: number): CirclePaint {
  const delayedPulse = (pulse + 0.48) % 1;
  const radius = 8 + delayedPulse * 17;
  return {
    "circle-radius": ["+", ["get", "radius"], radius],
    "circle-color": "rgba(6,182,212,0)",
    "circle-stroke-width": 2,
    "circle-stroke-color": RIPPLE_DELAY_COLOR,
    "circle-stroke-opacity": Math.max(0, 0.52 * (1 - delayedPulse)),
  };
}
