import { useStatusStore } from "@/stores";

/**
 * Non-blocking corner status indicator with an aria-live region (AGENTS.md:
 * "Surface status non-blockingly (corner pill + aria-live)"). Reads the data
 * lifecycle from the status slice; this is a dumb renderer of store state.
 *
 * NOTE: stub. Wired to the data status union; visual polish + the map-load
 * lifecycle integration land with the fetch/render plumbing.
 */
const LABELS: Record<string, string> = {
  idle: "Ready",
  fetching: "Loading earthquakes…",
  rendering: "Rendering…",
  ready: "Up to date",
  empty: "No earthquakes match these filters",
  error: "Couldn't load earthquakes",
};

export function StatusPill() {
  const data = useStatusStore((s) => s.data);
  const label =
    data.kind === "ready"
      ? `${data.count} earthquake${data.count === 1 ? "" : "s"}`
      : data.kind === "error"
        ? `${LABELS.error}: ${data.message}`
        : (LABELS[data.kind] ?? data.kind);

  return (
    <output
      aria-live="polite"
      className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-full border border-border bg-card/90 px-3 py-1.5 text-sm font-medium text-card-foreground shadow-sm backdrop-blur"
    >
      {label}
    </output>
  );
}
