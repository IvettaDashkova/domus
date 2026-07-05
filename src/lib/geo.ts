/** Great-circle (haversine) distances. Pure math — safe on client and server. */

/** Distance in metres between two lat/lng points. */
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Distance in kilometres between two lat/lng points. */
export const haversineKm = (
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number => haversineMeters(aLat, aLng, bLat, bLng) / 1000;
