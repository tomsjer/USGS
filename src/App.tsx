import { Activity } from "lucide-react";
import { useEffect } from "react";
import { FilterDrawer } from "@/components/FilterDrawer/FilterDrawer";
import { FilterForm } from "@/components/FilterForm/FilterForm";
import { Legend } from "@/components/Legend/Legend";
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
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { runQuery, useFiltersStore } from "@/stores";

/**
 * App shell: filters live in a sidebar on desktop and a bottom drawer on mobile,
 * alongside a full-bleed map with a non-blocking status pill and age legend. The map
 * stays mounted across the breakpoint — only the filter container swaps. Toasts
 * confirm each query result. Components are dumb renderers of store state — no
 * fetching here; the one lifecycle trigger is the initial query on mount.
 */
export function App() {
  const isMobile = useIsMobile();

  // Seed the first paint from the default filters. Submit-driven queries take over
  // from here; this effect is a one-shot lifecycle trigger, not derived state.
  useEffect(() => {
    void runQuery(useFiltersStore.getState().applied);
  }, []);

  return (
    <SidebarProvider>
      {!isMobile && (
        <Sidebar side="left">
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
      )}
      <SidebarInset className="relative">
        <header className="flex h-12 items-center gap-2 border-b px-4">
          {!isMobile && <SidebarTrigger />}
          <Activity className="size-5 text-primary md:hidden" />
          <span className="text-base font-semibold md:hidden">Quake Map</span>
          <span className="text-sm text-muted-foreground ">USGS Earthquakes</span>
        </header>
        <main className="relative flex-1">
          <QuakeMap />
          <StatusPill />
          <Legend />
          {isMobile && <FilterDrawer />}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
