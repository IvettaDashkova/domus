import { travelTimeMatrix, routeGeometry, type Coord, type LineString } from "@/lib/routing/matrix";
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
}

const parseTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h * 60 + (m || 0)) * 60;
};
const fmtTime = (s: number) => {
  const m = Math.round(s / 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Plan an optimized viewing route: origin + listings -> ordered itinerary. */
export async function planRoute(input: PlanInput): Promise<RoutePlan> {
  const dwell = (input.dwellMin ?? 30) * 60;
  const ret = input.returnToStart ?? true;
  const coords: Coord[] = [input.start, ...input.listings.map((l) => ({ lng: l.lng, lat: l.lat }))];

  const raw = await travelTimeMatrix(coords);
  const d = raw.map((row) => row.map((v) => (v == null ? 1e9 : v))); // sanitize unroutable

  const naive = tourCost(d, coords.map((_, i) => i), ret);
  const { order, totalSeconds } = solveTsp(d, { start: 0, returnToStart: ret });

  const geoCoords = order.map((i) => coords[i]);
  if (ret) geoCoords.push(coords[order[0]]);
  const geo = await routeGeometry(geoCoords);

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
    geojson: geo.geojson,
    optimizedDriveSec: totalSeconds,
    naiveDriveSec: naive,
    savedSec: Math.max(0, naive - totalSeconds),
    returnToStart: ret,
  };
}
