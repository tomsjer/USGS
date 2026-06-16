import { useMemo } from "react";
import { formatMagnitude, magnitudeCircleRadius, roundMagnitude } from "@/lib/utils";

const SAMPLE_COUNT = 5;
const GAP = 10; // px between adjacent circle edges
const PAD = 4; // px padding around the row

interface MagnitudeRadiusHintProps {
  min: number;
  max: number;
}

interface Sample {
  id: string;
  radius: number;
  cx: number;
}

interface Layout {
  samples: Sample[];
  width: number;
  height: number;
  baseline: number;
}

/**
 * Visual hint mapping the selected magnitude range to on-map circle sizes. A row
 * of sample circles (radii from `magnitudeCircleRadius`, the same curve the map
 * uses) laid out left→right with a gap between edges so they never overlap, all
 * resting on a shared baseline. The SVG scales to fit its container via viewBox.
 */
export function MagnitudeRadiusHint({ min, max }: MagnitudeRadiusHintProps) {
  const { samples, width, height, baseline } = useMemo(() => layout(min, max), [min, max]);
  const minRadius = magnitudeCircleRadius(min);
  const maxRadius = magnitudeCircleRadius(max);

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Map circle radius</span>
        <span className="font-medium text-foreground">
          {formatRadius(minRadius)} – {formatRadius(maxRadius)}
        </span>
      </div>
      <div
        className="mt-3 rounded-sm bg-background/50 px-3 py-2"
        role="img"
        aria-label={`Selected magnitudes render as map circles from ${formatRadius(minRadius)} to ${formatRadius(maxRadius)}`}
      >
        <svg
          aria-hidden="true"
          className="h-14 w-full overflow-visible text-primary"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            x1={PAD}
            x2={width - PAD}
            y1={baseline + 0.5}
            y2={baseline + 0.5}
            className="stroke-border"
            strokeWidth="1"
          />
          {samples.map((sample) => (
            <circle
              key={sample.id}
              cx={sample.cx}
              cy={baseline - sample.radius}
              r={sample.radius}
              fill="currentColor"
              fillOpacity="0.5"
              stroke="white"
              strokeOpacity="0.8"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>M{formatMagnitude(min)}</span>
        <span>M{formatMagnitude(max)}</span>
      </div>
    </div>
  );
}

/**
 * Sample evenly across the range, drop circles whose radius matches the previous
 * one (the radius curve plateaus past M8, which would otherwise draw identical
 * twins), then place them edge-to-edge with a gap on a shared baseline.
 */
function layout(min: number, max: number): Layout {
  const step = (max - min) / (SAMPLE_COUNT - 1);

  const radii: number[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const magnitude = i === SAMPLE_COUNT - 1 ? max : roundMagnitude(min + step * i);
    const radius = magnitudeCircleRadius(magnitude);
    const prev = radii[radii.length - 1];
    if (prev !== undefined && Math.abs(prev - radius) < 0.5) continue;
    radii.push(radius);
  }

  let cx = PAD;
  let prevRadius = 0;
  const samples: Sample[] = radii.map((radius, i) => {
    cx += i === 0 ? radius : GAP + prevRadius + radius;
    prevRadius = radius;
    return { id: `${i}`, radius, cx };
  });

  const maxRadius = Math.max(...radii);
  const last = samples[samples.length - 1];
  const width = (last ? last.cx + last.radius : PAD) + PAD;
  const height = 2 * maxRadius + 2 * PAD;
  return { samples, width, height, baseline: height - PAD };
}

function formatRadius(radius: number): string {
  return `${Math.round(radius)}px`;
}
