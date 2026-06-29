"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  html?: string;
  color?: string;
}

export interface MapView {
  lng: number;
  lat: number;
  radiusKm: number; // ~half-diagonal of the current viewport
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function viewOf(map: maplibregl.Map): MapView {
  const c = map.getCenter();
  const ne = map.getBounds().getNorthEast();
  return { lng: c.lng, lat: c.lat, radiusKm: haversineKm(c.lat, c.lng, ne.lat, ne.lng) };
}

export interface MapFocus {
  id: string;
  lng: number;
  lat: number;
  key: number; // changes on every click so re-selecting the same pin refocuses
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
  focus,
}: {
  markers: MapMarker[];
  onMoveEnd?: (v: MapView) => void;
  focus?: MapFocus | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerObjs = useRef<maplibregl.Marker[]>([]);
  const markerById = useRef<Record<string, maplibregl.Marker>>({});
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
    map.on("load", () => {
      setReady(true);
      onMoveEnd?.(viewOf(map)); // seed the view so "Near map" works before any pan
    });
    map.on("moveend", () => onMoveEnd?.(viewOf(map)));
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
    markerById.current = {};
    markerObjs.current = markers.map((m) => {
      const el = document.createElement("div");
      el.className = "pin";
      el.style.background = m.color ?? "#2f6bff";
      const popup =
        m.html || m.label
          ? new maplibregl.Popup({ offset: 16, closeButton: false, className: "domus-popup" })
          : undefined;
      if (popup) {
        if (m.html) popup.setHTML(m.html);
        else popup.setText(m.label!);
      }
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .setPopup(popup)
        .addTo(map);
      markerById.current[m.id] = marker;
      return marker;
    });
  }, [markers, ready]);

  // Fly to a clicked listing and open its popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.getZoom(), 13), speed: 1.2 });
    const marker = markerById.current[focus.id];
    if (marker && !marker.getPopup()?.isOpen()) marker.togglePopup();
  }, [focus, ready]);

  if (failed) {
    return <div className="empty" style={{ margin: "auto" }}>Map unavailable (WebGL required).</div>;
  }
  return <div ref={ref} className="maplibregl-map" style={{ width: "100%", height: "100%" }} />;
}
