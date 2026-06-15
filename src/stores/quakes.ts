import { create } from "zustand";
import type { Earthquake } from "@/lib/usgs";

/**
 * The current earthquake result set. A dumb slice — fetching/validation happens
 * in the framework-free usgs layer; this just holds the typed result that the
 * map and sidebar render. Stale-while-revalidate is expressed by keeping the
 * previous list until a new one replaces it.
 */
interface QuakesState {
  items: Earthquake[];
  setItems: (items: Earthquake[]) => void;
  clear: () => void;
}

export const useQuakesStore = create<QuakesState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  clear: () => set({ items: [] }),
}));
