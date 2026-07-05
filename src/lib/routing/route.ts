import {
  travelTimeMatrix,
  routeGeometry,
  haversineMatrix,
  straightLineGeometry,
  type Coord,
  type LineString,
} from "@/lib/routing/matrix";
import { solveTsp, tourCost } from "@/lib/routing/tsp";

export interface PlanListing {
  id: string;
  address?: string | null;
  lng: number;
  lat: number;
}

export interface PlanInput {
  start: Coord;
  listings: PlanListing[];
  startTime?: string; // "HH:MM", default 09:00
  dwellMin?: number; // minutes per viewing, default 30
  returnToStart?: boolean; // default true
  dayEnd?: string; // "HH:MM" — arrivals after this are flagged late
}

export interface PlanStop {
  position: number; // 0 = start/origin
  listingId: string | null;
  address: string | null;
  lng: number;
  lat: number;
  legFromPrevSec: number;
  arrival: string;
  depart: string;
  late: boolean;
}

export interface RoutePlan {
  stops: PlanStop[];
  geojson: LineString;
  optimizedDriveSec: number;
  naiveDriveSec: number;
  savedSec: number;
  returnToStart: boolean;
  mode: "osrm" | "estimated"; // "estimated" = straight-line fallback (no road data)
  degraded: boolean; // true if any leg time is a straight-line estimate, not OSRM
}

const parseTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h * 60 + (m || 0)) * 60;
};
const fmtTime = (s: number) => {
  const m = Math.round(s / 60);
  const day = Math.floor(m / 1440); // whole days past the start day
  const hh = String(Math.floor(m / 60) % 24).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  // Flag rollover so a route running past midnight reads "00:15 +1d", not "00:15".
  return day > 0 ? `${hh}:${mm} +${day}d` : `${hh}:${mm}`;
};

/** Plan an optimized viewing route: origin + listings -> ordered itinerary. */
export async function planRoute(input: PlanInput): Promise<RoutePlan> {
  const dwell = (input.dwellMin ?? 30) * 60;
  const ret = input.returnToStart ?? true;
  const coords: Coord[] = [
    input.start,
    ...input.listings.map((l) => ({ lng: l.lng, lat: l.lat })),
  ];
  const est = haversineMatrix(coords);

  // Try OSRM; fall back to straight-line estimates when it's unreachable or
  // returns a degenerate all-zero matrix (coords outside the loaded road network,
  // which OSRM snaps to a single boundary node → every leg reads 0).
  let mode: "osrm" | "estimated" = "osrm";
  // True once any leg time is a straight-line estimate — either the whole
  // matrix fell back (mode="estimated") or OSRM left individual legs unroutable
  // and we patched them in. Surfaced so the client can flag rough ETAs.
  let partialEstimate = false;
  let d: number[][];
  try {
    const raw = await travelTimeMatrix(coords);
    // Replace unroutable (null) legs with the straight-line estimate.
    d = raw.map((row, i) =>
      row.map((v, j) => {
        if (v == null) {
          partialEstimate = true;
          return est[i][j];
        }
        return v;
      }),
    );
    const distinct = new Set(
      coords.map((c) => `${c.lng.toFixed(4)},${c.lat.toFixed(4)}`),
    ).size;
    let sum = 0;
    for (const row of d) for (const v of row) sum += v;
    if (distinct > 1 && sum < 1) throw new Error("degenerate OSRM matrix");
  } catch {
    mode = "estimated";
    d = est;
  }

  const naive = tourCost(
    d,
    coords.map((_, i) => i),
    ret,
  );
  const { order, totalSeconds } = solveTsp(d, { start: 0, returnToStart: ret });

  const geoCoords = order.map((i) => coords[i]);
  if (ret) geoCoords.push(coords[order[0]]);
  let geojson: LineString;
  if (mode === "osrm") {
    try {
      const geo = await routeGeometry(geoCoords);
      geojson =
        geo.geojson.coordinates.length >= 2
          ? geo.geojson
          : straightLineGeometry(geoCoords);
    } catch {
      geojson = straightLineGeometry(geoCoords);
    }
  } else {
    geojson = straightLineGeometry(geoCoords);
  }

  const dayEnd = input.dayEnd ? parseTime(input.dayEnd) : null;
  let clock = parseTime(input.startTime ?? "09:00");
  const stops: PlanStop[] = order.map((idx, k) => {
    const leg = k === 0 ? 0 : d[order[k - 1]][idx];
    if (k > 0) clock += leg;
    const arrival = clock;
    const isStart = idx === 0;
    const listing = isStart ? null : input.listings[idx - 1];
    if (!isStart) clock += dwell;
    return {
      position: k,
      listingId: listing?.id ?? null,
      address: isStart ? "Start" : (listing?.address ?? null),
      lng: coords[idx].lng,
      lat: coords[idx].lat,
      legFromPrevSec: leg,
      arrival: fmtTime(arrival),
      depart: fmtTime(clock),
      late: dayEnd != null && !isStart && arrival > dayEnd,
    };
  });

  return {
    stops,
    geojson,
    optimizedDriveSec: totalSeconds,
    naiveDriveSec: naive,
    savedSec: Math.max(0, naive - totalSeconds),
    returnToStart: ret,
    mode,
    degraded: mode === "estimated" || partialEstimate,
  };
}
