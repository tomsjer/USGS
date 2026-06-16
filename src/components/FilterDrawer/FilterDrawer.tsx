import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { FilterForm } from "@/components/FilterForm/FilterForm";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * Mobile filter entry point. Replaces the sidebar's off-canvas Sheet with a
 * bottom drawer opened by a fixed, bottom-center "Filters" button. Submitting
 * the form closes the drawer (the result lands on the map behind it).
 */
export function FilterDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          className="-translate-x-1/2 pointer-events-auto fixed bottom-4 left-1/2 z-20 shadow-md"
          size="lg"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter earthquakes by date and magnitude.</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <FilterForm onSubmitted={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
