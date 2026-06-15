import { Activity } from "lucide-react";
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

/**
 * App shell: collapsible sidebar (filters) + full-bleed map with a non-blocking
 * status pill. Components are dumb renderers of store state — no fetching here.
 */
export function App() {
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
