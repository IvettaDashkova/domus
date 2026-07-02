import { osrmUrl } from "@/lib/env";

export interface Coord {
  lng: number;
  lat: number;
}

export interface LineString {
  type: "LineString";
  coordinates: [number, number][];
}

/**
 * Travel-time matrix via OSRM /table. Returns an N×N matrix of durations in
 * seconds (durations[i][j] = drive time from coord i to coord j).
 */
export async function travelTimeMatrix(coords: Coord[]): Promise<number[][]> {
  if (coords.length < 2) throw new Error("need at least 2 coordinates");
  const path = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `${osrmUrl()}/table/v1/driving/${path}?annotations=duration`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM /table HTTP ${res.status}`);
  const j = (await res.json()) as { code: string; durations?: number[][] };
  if (j.code !== "Ok" || !j.durations) throw new Error(`OSRM /table: ${j.code}`);
  return j.durations;
}

/** Great-circle distance in metres. */
export function haversineMeters(a: Coord, b: Coord): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Straight-line travel-time estimate when road data isn't available for these
// coords (e.g. listings outside the loaded OSRM region). ~32 km/h urban average,
// ×1.3 to approximate road detour vs. crow-flies.
const EST_MPS = (32 * 1000) / 3600;
export function haversineMatrix(coords: Coord[]): number[][] {
  return coords.map((a) => coords.map((b) => (haversineMeters(a, b) * 1.3) / EST_MPS));
}

/** A simple polyline straight through the ordered waypoints. */
export function straightLineGeometry(coords: Coord[]): LineString {
  return { type: "LineString", coordinates: coords.map((c) => [c.lng, c.lat]) };
}

export interface RouteGeometry {
  geojson: LineString;
  legSeconds: number[]; // duration of each leg between consecutive waypoints
  totalSeconds: number;
}

/** Road geometry + per-leg durations through ordered waypoints via OSRM /route. */
export async function routeGeometry(coords: Coord[]): Promise<RouteGeometry> {
  const path = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `${osrmUrl()}/route/v1/driving/${path}?overview=full&geometries=geojson&annotations=duration`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM /route HTTP ${res.status}`);
  const j = (await res.json()) as {
    code: string;
    routes?: { geometry: LineString; duration: number; legs: { duration: number }[] }[];
  };
  if (j.code !== "Ok" || !j.routes?.[0]) throw new Error(`OSRM /route: ${j.code}`);
  const r = j.routes[0];
  return {
    geojson: r.geometry,
    legSeconds: r.legs.map((l) => l.duration),
    totalSeconds: r.duration,
  };
}
