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

export interface LngLat {
  lng: number;
  lat: number;
}

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/**
 * Dark MapLibre map (Carto dark-matter) with custom colored category pins.
 * The map instance is created once; markers update in place so searching never
 * resets the view. Reports its center via onMoveEnd (feeds the spatial signal).
 */
export default function Map({
  markers,
  onMoveEnd,
}: {
  markers: MapMarker[];
  onMoveEnd?: (c: LngLat) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerObjs = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (!ref.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style: DARK_STYLE,
        center: [-1.5, 52.5],
        zoom: 5.4,
        attributionControl: false,
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => setReady(true));
    map.on("moveend", () => {
      const c = map.getCenter();
      onMoveEnd?.({ lng: c.lng, lat: c.lat });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers whenever they (or readiness) change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const m of markerObjs.current) m.remove();
    markerObjs.current = markers.map((m) => {
      const el = document.createElement("div");
      el.className = "pin";
      el.style.background = m.color ?? "#2f6bff";
      return new maplibregl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .setPopup(
          m.label
            ? new maplibregl.Popup({ offset: 16, closeButton: false }).setText(m.label)
            : undefined,
        )
        .addTo(map);
    });
  }, [markers, ready]);

  if (failed) {
    return <div className="empty" style={{ margin: "auto" }}>Map unavailable (WebGL required).</div>;
  }
  return <div ref={ref} className="maplibregl-map" style={{ width: "100%", height: "100%" }} />;
}
