import { create } from "zustand";

/**
 * Map viewport slice: how many of the loaded quakes currently fall inside the
 * visible map bounds. The map writes this on move/idle; the status pill reads it
 * to show a `visible / total` ratio. A separate domain from `quakes` (what was
 * loaded) and `status` (lifecycle) — see AGENTS.md "one slice per domain".
 */
interface ViewportState {
  /** Count of loaded quakes within the current map bounds. */
  visible: number;
  setVisible: (visible: number) => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  visible: 0,
  setVisible: (visible) => set({ visible }),
}));
