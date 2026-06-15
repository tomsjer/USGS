import { formatMagnitude, magnitudeCircleRadius, roundMagnitude } from "@/lib/utils";

const SVG_WIDTH = 180;
const SVG_HEIGHT = 56;
const SAMPLE_X = [26, 58, 90, 122, 154] as const;

interface MagnitudeRadiusHintProps {
  min: number;
  max: number;
}

export function MagnitudeRadiusHint({ min, max }: MagnitudeRadiusHintProps) {
  const samples = sampleMagnitudes(min, max);
  const minRadius = magnitudeCircleRadius(min);
  const maxRadius = magnitudeCircleRadius(max);

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Map circle radius</span>
        <span className="font-medium text-foreground">
          {formatRadius(minRadius)} - {formatRadius(maxRadius)}
        </span>
      </div>
      <div
        className="mt-3 rounded-sm bg-background/50 px-3 py-2"
        role="img"
        aria-label={`Selected magnitudes render as map circles from ${formatRadius(minRadius)} to ${formatRadius(maxRadius)}`}
      >
        <svg
          aria-hidden="true"
          className="h-16 w-full overflow-visible text-primary"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        >
          <line
            x1={SAMPLE_X[0]}
            x2={SAMPLE_X[SAMPLE_X.length - 1]}
            y1={SVG_HEIGHT - 1}
            y2={SVG_HEIGHT - 1}
            className="stroke-border"
            strokeWidth="1"
          />
          {samples.map((sample) => {
            const radius = magnitudeCircleRadius(sample.magnitude);

            return (
              <circle
                key={sample.id}
                cx={sample.x}
                cy={SVG_HEIGHT - radius - 1}
                r={radius}
                fill="currentColor"
                fillOpacity="0.68"
                stroke="white"
                strokeOpacity="0.75"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>M{formatMagnitude(min)}</span>
        <span>M{formatMagnitude(max)}</span>
      </div>
    </div>
  );
}

function sampleMagnitudes(
  min: number,
  max: number,
): { id: string; magnitude: number; x: number }[] {
  const step = (max - min) / 4;
  return [
    { id: "min", magnitude: min, x: SAMPLE_X[0] },
    { id: "low-mid", magnitude: roundMagnitude(min + step), x: SAMPLE_X[1] },
    { id: "mid", magnitude: roundMagnitude(min + step * 2), x: SAMPLE_X[2] },
    { id: "high-mid", magnitude: roundMagnitude(min + step * 3), x: SAMPLE_X[3] },
    { id: "max", magnitude: max, x: SAMPLE_X[4] },
  ];
}

function formatRadius(radius: number): string {
  return `${Math.round(radius)}px`;
}
