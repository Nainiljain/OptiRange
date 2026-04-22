// lib/tripUtils.ts
// Pure utility functions and shared types — NOT a server action file.
// Safe to import in both client components and server actions.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChargingStation {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  lat: number;
  lon: number;
  level2Ports: number;
  dcFastPorts: number;
  network: string;
  distanceKm?: number;
}

export interface Stop {
  name: string;
  location: string;
  arriveWith: string;
  chargeTime: string;
  chargeTo: string;
  station?: ChargingStation;
}

export interface RouteResult {
  distance: number;
  timeStr: string;
  batteryUsed: number;
  stops: Stop[];
  startCoords?: { lat: number; lon: number };
  destCoords?: { lat: number; lon: number };
  distanceSource?: string;
  mlStatus?: string;
  mlHealthAdvice?: string;
  mlEffectiveRange?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Linearly interpolate N waypoints along the great-circle path between two coords.
 * Used to find charging-stop search centres along a route.
 */
export function interpolateWaypoints(
  startLat: number,
  startLon: number,
  destLat: number,
  destLon: number,
  numStops: number
): Array<{ lat: number; lon: number }> {
  const waypoints: Array<{ lat: number; lon: number }> = [];
  for (let i = 1; i <= numStops; i++) {
    const fraction = i / (numStops + 1);
    waypoints.push({
      lat: startLat + (destLat - startLat) * fraction,
      lon: startLon + (destLon - startLon) * fraction,
    });
  }
  return waypoints;
}
