import { formatMagnitude, magnitudeCircleRadius, roundMagnitude } from "@/lib/utils";

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
        className="mt-3 flex h-16 items-end justify-between gap-2 rounded-sm bg-background/50 px-3 py-2"
        role="img"
        aria-label={`Selected magnitudes render as map circles from ${formatRadius(minRadius)} to ${formatRadius(maxRadius)}`}
      >
        {samples.map((sample) => {
          const diameter = magnitudeCircleRadius(sample.magnitude) * 2;

          return (
            <span
              key={sample.id}
              aria-hidden="true"
              className="block rounded-full border border-white/70 bg-primary/70 shadow-sm"
              style={{ width: diameter, height: diameter }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>M{formatMagnitude(min)}</span>
        <span>M{formatMagnitude(max)}</span>
      </div>
    </div>
  );
}

function sampleMagnitudes(min: number, max: number): { id: string; magnitude: number }[] {
  const step = (max - min) / 4;
  return [
    { id: "min", magnitude: min },
    { id: "low-mid", magnitude: roundMagnitude(min + step) },
    { id: "mid", magnitude: roundMagnitude(min + step * 2) },
    { id: "high-mid", magnitude: roundMagnitude(min + step * 3) },
    { id: "max", magnitude: max },
  ];
}

function formatRadius(radius: number): string {
  return `${Math.round(radius)}px`;
}
