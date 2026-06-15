import { toast } from "sonner";
import { fetchEarthquakes, toErrorMessage } from "@/lib/usgs";
import type { FilterValues } from "./filters";
import { useFiltersStore } from "./filters";
import { useQuakesStore } from "./quakes";
import { useStatusStore } from "./status";

/**
 * Submit → fetch → store controller. This is the one place the data lifecycle is
 * driven: it records the applied filters, flips the data status union, calls the
 * framework-free usgs layer, and writes the typed result into the quakes slice.
 *
 * It is deliberately NOT a component and NOT part of `lib/usgs` (which stays
 * framework-free). Each call owns an AbortController; a newer call aborts the
 * in-flight one so a stale response can never overwrite newer results
 * (AGENTS.md: "abort superseded fetches", "latest response wins").
 *
 * The terminal `rendering → ready` hop is intentionally left to the map: it fires
 * on MapLibre's `idle` event after the source updates (see QuakeMap).
 */

let inFlight: AbortController | null = null;

export async function runQuery(filters: FilterValues): Promise<void> {
  // Abort any superseded request before starting a new one.
  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;

  useFiltersStore.getState().setApplied(filters);
  useStatusStore.getState().setData({ kind: "fetching" });

  try {
    const collection = await fetchEarthquakes(filters, controller.signal);
    if (controller.signal.aborted) return; // superseded — drop the result

    const features = collection.features;
    useQuakesStore.getState().setItems(features);
    useStatusStore
      .getState()
      .setData(features.length === 0 ? { kind: "empty" } : { kind: "rendering" });

    // Transient confirmation of the result (the pill carries the persistent state).
    if (features.length === 0) {
      toast("No earthquakes match these filters");
    } else {
      toast.success(`Found ${features.length.toLocaleString()} earthquakes`);
    }
  } catch (err) {
    if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
      return; // expected on supersede — keep prior points & status
    }
    const message = toErrorMessage(err);
    useStatusStore.getState().setData({ kind: "error", message });
    toast.error(message);
  } finally {
    if (inFlight === controller) inFlight = null;
  }
}
