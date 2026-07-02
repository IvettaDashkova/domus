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

export interface RouteLine {
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteStop {
  lng: number;
  lat: number;
  n: number; // 0 = start, 1..N = viewings
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
  routeLine,
  routeStops,
  highlightId,
}: {
  markers: MapMarker[];
  onMoveEnd?: (v: MapView) => void;
  focus?: MapFocus | null;
  routeLine?: RouteLine | null;
  routeStops?: RouteStop[] | null;
  highlightId?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerObjs = useRef<maplibregl.Marker[]>([]);
  const markerById = useRef<Record<string, maplibregl.Marker>>({});
  const routeMarkerObjs = useRef<maplibregl.Marker[]>([]);
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
        center: [19.4, 52.0],
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

  // Draw / update the optimized route polyline.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const data = routeLine
      ? { type: "Feature" as const, geometry: routeLine, properties: {} }
      : { type: "FeatureCollection" as const, features: [] };
    const src = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data);
    } else {
      map.addSource("route", { type: "geojson", data });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: { "line-color": "#2f6bff", "line-width": 4, "line-opacity": 0.85 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
    }
    if (routeLine && routeLine.coordinates.length) {
      const lons = routeLine.coordinates.map((c) => c[0]);
      const lats = routeLine.coordinates.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 70, duration: 800 },
      );
    }
  }, [routeLine, ready]);

  // Numbered route-stop markers (in visiting order).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const m of routeMarkerObjs.current) m.remove();
    routeMarkerObjs.current = (routeStops ?? []).map((s) => {
      const el = document.createElement("div");
      el.className = "pin-num";
      el.textContent = s.n === 0 ? "S" : String(s.n);
      return new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
    });
  }, [routeStops, ready]);

  // Hover sync: highlight the pin for the hovered card.
  useEffect(() => {
    for (const [id, m] of Object.entries(markerById.current)) {
      m.getElement().classList.toggle("pin-hi", id === highlightId);
    }
  }, [highlightId, markers]);

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
