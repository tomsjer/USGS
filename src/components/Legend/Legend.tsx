import { Layers, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AGE_COLORS } from "@/lib/constants";
import { useUiStore } from "@/stores";

/** Illustrative dot sizes (small → large) for the magnitude scale hint. */
const MAGNITUDE_DOTS = ["size-2", "size-3", "size-4", "size-5", "size-7"] as const;

/**
 * Non-blocking map legend for the age color scale. Circle radius encodes
 * magnitude; color encodes how recent the event is (warm = recent → cool = old).
 * A dumb renderer of the shared `AGE_COLORS` table — the same source the map's
 * color expression and the filter date presets are built from.
 *
 * On mobile it's collapsed by default to a small icon button (taps to expand) to
 * keep the map clear; on desktop it's always expanded.
 */
export function Legend() {
  const isMobile = useIsMobile();
  const expanded = useUiStore((s) => s.legendExpanded);
  const setExpanded = useUiStore((s) => s.setLegendExpanded);
  const open = !isMobile || expanded;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Show age legend"
        className="pointer-events-auto absolute top-4 left-4 z-10 rounded-full border border-border bg-card/90 p-2 text-card-foreground shadow-sm backdrop-blur"
      >
        <Layers className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-lg border border-border bg-card/90 px-3 py-2 text-card-foreground shadow-sm backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">Event age</p>
        {isMobile && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Hide age legend"
            className="-mr-1 pointer-events-auto text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
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
      <div className="mt-2 border-border border-t pt-2">
        <p className="mb-1.5 text-xs font-semibold">Magnitude</p>
        {/* Stroke-only circles hint that radius scales with magnitude; sizes are
            illustrative, not the exact map radii. The M-1/M10 endpoints keep a
            stronger stroke; the in-between steps are gray so they read as a
            gradient, not as additional labelled buckets. */}
        <div className="flex items-end justify-between gap-2">
          {MAGNITUDE_DOTS.map((size, i) => (
            <span
              key={size}
              className={`${size} shrink-0 rounded-full border ${
                i === 0 || i === MAGNITUDE_DOTS.length - 1
                  ? "border-foreground/60"
                  : "border-muted-foreground/40"
              }`}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs">
          <span>M-1</span>
          <span>M10</span>
        </div>
      </div>
    </div>
  );
}
