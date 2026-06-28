"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  color?: string;
}

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/**
 * Dark MapLibre map (Carto dark-matter basemap) with custom colored category
 * pins. Deck.gl layers arrive when the matcher needs them.
 */
export default function Map({ markers }: { markers: MapMarker[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style: DARK_STYLE,
        center: [-1.5, 52.5], // UK
        zoom: 5.4,
        attributionControl: false,
      });
    } catch {
      // e.g. WebGL unavailable — degrade gracefully instead of blanking the app.
      queueMicrotask(() => setFailed(true));
      return;
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      for (const m of markers) {
        const el = document.createElement("div");
        el.className = "pin";
        el.style.background = m.color ?? "#2f6bff";
        new maplibregl.Marker({ element: el })
          .setLngLat([m.lng, m.lat])
          .setPopup(
            m.label
              ? new maplibregl.Popup({ offset: 16, closeButton: false }).setText(m.label)
              : undefined,
          )
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [markers]);

  if (failed) {
    return <div className="empty" style={{ margin: "auto" }}>Map unavailable (WebGL required).</div>;
  }
  return <div ref={ref} className="maplibregl-map" style={{ width: "100%", height: "100%" }} />;
}
