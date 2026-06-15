import { create } from "zustand";

/**
 * App status modelled as discriminated unions — never isLoading/isFetching booleans.
 * Two independent lifecycles (see AGENTS.md "UX & app state"):
 *
 *  - Map:  idle → loading → ready          (driven by MapLibre's `load` event)
 *  - Data: idle → fetching → rendering → ready, plus `empty` and `error`
 *          (`rendering → ready` fires on MapLibre's `idle` event after a source update)
 */

export type MapStatus = { kind: "idle" } | { kind: "loading" } | { kind: "ready" };

export type DataStatus =
  | { kind: "idle" }
  | { kind: "fetching" }
  | { kind: "rendering" }
  | { kind: "ready"; count: number }
  | { kind: "empty" }
  | { kind: "error"; message: string };

interface StatusState {
  map: MapStatus;
  data: DataStatus;
  setMap: (status: MapStatus) => void;
  setData: (status: DataStatus) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  map: { kind: "idle" },
  data: { kind: "idle" },
  setMap: (map) => set({ map }),
  setData: (data) => set({ data }),
}));
