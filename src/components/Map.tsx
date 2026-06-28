"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label?: string;
}

/**
 * Minimal MapLibre map on OpenFreeMap tiles. Deck.gl layers come when the
 * matcher needs them — Phase 0 just renders listings as points.
 */
export default function Map({ markers }: { markers: MapMarker[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [-1.5, 52.5], // UK
      zoom: 5.2,
    });

    map.on("load", () => {
      for (const m of markers) {
        new maplibregl.Marker({ color: "#4c9aff" })
          .setLngLat([m.lng, m.lat])
          .setPopup(
            m.label ? new maplibregl.Popup().setText(m.label) : undefined,
          )
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [markers]);

  return (
    <div
      ref={ref}
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
    />
  );
}
