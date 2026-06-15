import { AlertTriangle, Eye } from "lucide-react";
import { useQuakesStore, useStatusStore, useViewportStore } from "@/stores";

/**
 * Non-blocking corner status indicator with an aria-live region (AGENTS.md:
 * "Surface status non-blockingly (corner pill + aria-live)"). Reads the data
 * lifecycle from the status slice and the in-viewport count from the viewport
 * slice; this is a dumb renderer of store state.
 *
 * When points are loaded it shows a `visible / total` ratio (with an eye icon
 * whenever fewer are in view than loaded). Error and empty are explicit,
 * persistent states — toasts are the transient confirmation on top.
 */
function plural(n: number): string {
  return `${n.toLocaleString()} earthquake${n === 1 ? "" : "s"}`;
}

export function StatusPill() {
  const data = useStatusStore((s) => s.data);
  const total = useQuakesStore((s) => s.items.length);
  const visible = useViewportStore((s) => s.visible);

  const isError = data.kind === "error";
  const message = isError ? data.message : undefined;

  let content: React.ReactNode;
  if (data.kind === "fetching") {
    content = "Loading earthquakes…";
  } else if (data.kind === "rendering") {
    content = "Rendering…";
  } else if (data.kind === "empty") {
    content = "No earthquakes match these filters";
  } else if (isError) {
    content = (
      <>
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        Couldn't load earthquakes
      </>
    );
  } else if (total > 0) {
    // ready (or idle with prior results): show visible / total.
    content =
      visible < total ? (
        <>
          <Eye className="size-4 shrink-0" aria-hidden />
          {visible.toLocaleString()} / {plural(total)}
        </>
      ) : (
        plural(total)
      );
  } else {
    content = "Ready";
  }

  return (
    <output
      aria-live="polite"
      title={message}
      data-error={isError || undefined}
      className="pointer-events-none absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-sm font-medium text-card-foreground shadow-sm backdrop-blur data-[error]:border-destructive/40 data-[error]:text-destructive"
    >
      {content}
    </output>
  );
}
