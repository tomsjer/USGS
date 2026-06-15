import { Activity } from "lucide-react";
import { useEffect } from "react";
import { FilterForm } from "@/components/FilterForm/FilterForm";
import { QuakeMap } from "@/components/QuakeMap/QuakeMap";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { runQuery, useFiltersStore } from "@/stores";

/**
 * App shell: collapsible sidebar (filters) + full-bleed map with a non-blocking
 * status pill. Components are dumb renderers of store state — no fetching here;
 * the one lifecycle trigger is the initial query on mount.
 */
export function App() {
  // Seed the first paint from the default filters. Submit-driven queries take over
  // from here; this effect is a one-shot lifecycle trigger, not derived state.
  useEffect(() => {
    void runQuery(useFiltersStore.getState().applied);
  }, []);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-3">
          <Activity className="size-5 text-primary" />
          <span className="text-base font-semibold">Quake Map</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Filters</SidebarGroupLabel>
            <SidebarGroupContent className="px-2 py-2">
              <FilterForm />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="relative">
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm text-muted-foreground">
            USGS earthquakes — filter and explore
          </span>
        </header>
        <main className="relative flex-1">
          <QuakeMap />
          <StatusPill />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
