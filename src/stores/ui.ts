import { create } from "zustand";

/**
 * UI chrome slice: ephemeral presentation state that isn't a data/domain
 * concern. Currently just whether the (mobile-collapsible) map legend is
 * expanded, so the map can collapse it when a quake popup opens to avoid overlap.
 */
interface UiState {
  /** Whether the legend is expanded (mobile collapses it to an icon button). */
  legendExpanded: boolean;
  setLegendExpanded: (expanded: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  legendExpanded: true,
  setLegendExpanded: (legendExpanded) => set({ legendExpanded }),
}));
