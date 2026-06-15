import { X } from "lucide-react";
import { formatMagnitude } from "@/lib/utils";

export interface PopupInfo {
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
    <div className="flex min-w-44 flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-snug text-foreground">{place}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="-mr-1 -mt-1 rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <dt className="font-medium">Magnitude</dt>
        <dd className="text-foreground">{mag}</dd>
        <dt className="font-medium">Time</dt>
        <dd className="text-foreground">{when}</dd>
      </dl>
    </div>
  );
}
