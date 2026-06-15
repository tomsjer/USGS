import { Marker } from "react-map-gl/maplibre";
import { DEFAULT_MAG } from "@/lib/constants";
import { magnitudeCircleRadius } from "@/lib/utils";

export interface QuakeHighlight {
  id: string | number | null;
  longitude: number;
  latitude: number;
  mag: number | null;
}

interface QuakeHighlightMarkerProps {
  highlight: QuakeHighlight;
  variant: "hover" | "selected";
}

export function QuakeHighlightMarker({ highlight, variant }: QuakeHighlightMarkerProps) {
  const radius = magnitudeCircleRadius(highlight.mag ?? DEFAULT_MAG);
  const size = Math.max((radius + (variant === "selected" ? 9 : 6)) * 2, 18);

  return (
    <Marker longitude={highlight.longitude} latitude={highlight.latitude} anchor="center">
      <span
        aria-hidden="true"
        className="quake-highlight-marker"
        data-variant={variant}
        style={{ width: size, height: size }}
      />
    </Marker>
  );
}
