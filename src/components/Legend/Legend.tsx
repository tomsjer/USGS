import { AGE_COLORS } from "@/lib/constants";

/**
 * Non-blocking map legend for the age color scale. Circle radius encodes
 * magnitude; color encodes how recent the event is (warm = recent → cool = old).
 * A dumb renderer of the shared `AGE_COLORS` table — the same source the map's
 * color expression is built from, so swatches always match the points.
 */
export function Legend() {
  return (
    <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-lg border border-border bg-card/90 px-3 py-2 text-card-foreground shadow-sm backdrop-blur">
      <p className="mb-1.5 text-xs font-semibold">Event age</p>
      <ul className="flex flex-col gap-1">
        {AGE_COLORS.map((bucket) => (
          <li key={bucket.label} className="flex items-center gap-2 text-xs">
            <span
              className="size-3 shrink-0 rounded-full border border-white/60"
              style={{ backgroundColor: bucket.color }}
            />
            {bucket.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
