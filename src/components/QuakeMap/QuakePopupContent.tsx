import { X } from "lucide-react";
import { formatMagnitude } from "@/lib/utils";

export interface PopupInfo {
  id: string | number | null;
  longitude: number;
  latitude: number;
  place: string | null;
  mag: number | null;
  time: number | null;
}

export function QuakePopupContent({ info, onClose }: { info: PopupInfo; onClose: () => void }) {
  const place = info.place?.trim() ? info.place : "Unknown location";
  const mag = info.mag === null ? "—" : formatMagnitude(info.mag);
  const when =
    info.time === null
      ? "Unknown time"
      : new Date(info.time).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });

  return (
    <div className="w-56">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground pb-2" title={place}>
          {place}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="rounded-sm p-0.5 pb-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
        M {mag}
      </span>
      <time className="mt-2 block text-xs text-muted-foreground">{when}</time>
    </div>
  );
}
