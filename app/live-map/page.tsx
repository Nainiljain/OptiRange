"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Zap, Navigation, Clock, Layers,
  RefreshCw, AlertCircle, ChevronRight, Battery,
  Mountain, Map, Satellite, Volume2, VolumeX,
  Maximize2, LocateFixed, Route,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stop {
  name: string; location: string; arriveWith: string;
  chargeTime: string; chargeTo: string;
  station?: { lat: number; lon: number; dcFastPorts?: number; level2Ports?: number; network?: string };
}

interface RouteResult {
  distance: number; timeStr: string; batteryUsed: number;
  stops: Stop[];
  startCoords: { lat: number; lon: number };
  destCoords:  { lat: number; lon: number };
  mlEffectiveRange?: number;
  arrivalTime?: string;
  departureTime?: string;
}

type MapMode = "default" | "satellite" | "terrain";

// ── Helpers ───────────────────────────────────────────────────────────────────

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const pts: Array<{ lat: number; lng: number }> = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LiveMapPage() {
  const mapDiv         = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const markersRef     = useRef<any[]>([]);
  const polylineRef    = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);
  const animFrameRef   = useRef<number>(0);
  const pathPointsRef  = useRef<Array<{ lat: number; lng: number }>>([]);
  const carMarkerRef   = useRef<any>(null);

  const [route, setRoute]             = useState<RouteResult | null>(null);
  const [error, setError]             = useState("");
  const [mapReady, setMapReady]       = useState(false);
  const [mapMode, setMapMode]         = useState<MapMode>("default");
  const [activeStop, setActiveStop]   = useState<number | null>(null);
  const [is3D, setIs3D]               = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navProgress, setNavProgress] = useState(0); // 0–1
  const [muted, setMuted]             = useState(false);
  const [currentSpeed]                = useState(0);

  // ── Load route ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("currentRoute");
    if (raw) {
      try { setRoute(JSON.parse(raw)); }
      catch { setError("Failed to parse route data."); }
    } else {
      setError("No active trip found. Plan a trip first.");
    }
  }, []);

  // ── Load Google Maps JS API ────────────────────────────────────────────────
  const loadGoogleMaps = useCallback((apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.maps) { resolve(); return; }
      const existing = document.querySelector('script[data-gmaps]');
      if (existing) { existing.addEventListener('load', () => resolve()); return; }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      script.dataset.gmaps = "1";
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  }, []);

  // ── Validate stop is near route ────────────────────────────────────────────
  const resolveStopCoord = useCallback((
    stop: Stop, idx: number, numStops: number,
    start: { lat: number; lon: number }, dest: { lat: number; lon: number }
  ): { lat: number; lng: number } => {
    const fraction  = (idx + 1) / (numStops + 1);
    const interpLat = start.lat + (dest.lat - start.lat) * fraction;
    const interpLon = start.lon + (dest.lon - start.lon) * fraction;
    if (stop.station?.lat && stop.station?.lon) {
      const dist = haversineKm(stop.station.lat, stop.station.lon, interpLat, interpLon);
      if (dist <= 300) return { lat: stop.station.lat, lng: stop.station.lon };
    }
    return { lat: interpLat, lng: interpLon };
  }, []);

  // ── Build map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!route || !mapDiv.current || mapRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
    if (!apiKey || apiKey.startsWith("YOUR_")) {
      setError("Google Maps API key not configured.");
      return;
    }

    const { startCoords: start, destCoords: dest, stops } = route;

    loadGoogleMaps(apiKey).then(() => {
      const G = (window as any).google.maps;

      // ── Create map with 3D tilt ──────────────────────────────────────
      const map = new G.Map(mapDiv.current!, {
        center:           { lat: start.lat, lng: start.lon },
        zoom:             13,
        tilt:             45,        // 3D perspective tilt
        heading:          0,
        mapTypeId:        G.MapTypeId.ROADMAP,
        disableDefaultUI: true,      // we build our own UI
        gestureHandling:  "greedy",
        styles: [
          // Dark mode map style (Tesla-like)
          { elementType: "geometry",            stylers: [{ color: "#1a1a2e" }] },
          { elementType: "labels.text.fill",    stylers: [{ color: "#8ec3f0" }] },
          { elementType: "labels.text.stroke",  stylers: [{ color: "#1a1a2e" }] },
          { featureType: "road",                elementType: "geometry",          stylers: [{ color: "#2d3561" }] },
          { featureType: "road",                elementType: "geometry.stroke",   stylers: [{ color: "#1a1a2e" }] },
          { featureType: "road",                elementType: "labels.text.fill",  stylers: [{ color: "#9ca3af" }] },
          { featureType: "road.highway",        elementType: "geometry",          stylers: [{ color: "#3b4a9e" }] },
          { featureType: "road.highway",        elementType: "geometry.stroke",   stylers: [{ color: "#1a1a2e" }] },
          { featureType: "road.highway",        elementType: "labels.text.fill",  stylers: [{ color: "#f8fafc" }] },
          { featureType: "poi",                 elementType: "geometry",          stylers: [{ color: "#16213e" }] },
          { featureType: "poi.park",            elementType: "geometry",          stylers: [{ color: "#0f3460" }] },
          { featureType: "water",               elementType: "geometry",          stylers: [{ color: "#0f3460" }] },
          { featureType: "water",               elementType: "labels.text.fill",  stylers: [{ color: "#4e6d8c" }] },
          { featureType: "transit.station",     elementType: "geometry",          stylers: [{ color: "#2f3dc8" }] },
          { featureType: "landscape",           elementType: "geometry",          stylers: [{ color: "#16213e" }] },
          { featureType: "administrative",      elementType: "geometry.stroke",   stylers: [{ color: "#334155" }] },
          { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
          { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d1d5db" }] },
        ],
      });
      mapRef.current = map;

      // ── Traffic layer ─────────────────────────────────────────────────
      const traffic = new G.TrafficLayer();
      traffic.setMap(map);
      trafficLayerRef.current = traffic;

      // ── Start marker (A) ───────────────────────────────────────────────
      new G.Marker({
        position: { lat: start.lat, lng: start.lon },
        map,
        icon: {
          path: G.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        label: { text: "A", color: "white", fontWeight: "bold", fontSize: "12px" },
        title: "Start",
        zIndex: 100,
      });

      // ── Destination marker (B) ─────────────────────────────────────────
      new G.Marker({
        position: { lat: dest.lat, lng: dest.lon },
        map,
        icon: {
          path: G.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#a855f7",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        label: { text: "B", color: "white", fontWeight: "bold", fontSize: "12px" },
        title: "Destination",
        zIndex: 100,
      });

      // ── Charging stop markers ──────────────────────────────────────────
      const newMarkers: any[] = [];
      stops.forEach((stop, idx) => {
        const pos = resolveStopCoord(stop, idx, stops.length, start, dest);
        const infoContent = `
          <div style="background:#0f172a;color:#f1f5f9;padding:14px;border-radius:12px;min-width:220px;font-family:system-ui,sans-serif;border:1px solid #334155">
            <p style="color:#10b981;font-weight:700;font-size:14px;margin:0 0 4px">${stop.name}</p>
            <p style="color:#94a3b8;font-size:11px;margin:0 0 10px">${stop.location}</p>
            <div style="display:flex;flex-direction:column;gap:5px;font-size:12px">
              <span>🔋 Arrive at: <b>${stop.arriveWith}</b></span>
              <span>⚡ Charge to: <b>${stop.chargeTo}</b></span>
              <span>⏱ Duration: <b>${stop.chargeTime}</b></span>
              ${stop.station?.dcFastPorts ? `<span>🔌 DCFC: <b>${stop.station.dcFastPorts} ports</b></span>` : ""}
              ${stop.station?.network ? `<span>🌐 Network: <b>${stop.station.network}</b></span>` : ""}
            </div>
          </div>`;
        const infoWindow = new G.InfoWindow({ content: infoContent });

        const marker = new G.Marker({
          position: pos,
          map,
          icon: {
            path: G.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2.5,
          },
          label: { text: "⚡", fontSize: "14px" },
          title: stop.name,
          zIndex: 90,
        });

        marker.addListener("click", () => {
          markersRef.current.forEach(m => (m as any)._iw?.close());
          (marker as any)._iw = infoWindow;
          infoWindow.open(map, marker);
          setActiveStop(idx);
        });

        (marker as any)._iw = infoWindow;
        newMarkers.push(marker);
      });
      markersRef.current = newMarkers;

      // ── Directions API — real road polyline ────────────────────────────
      const directionsService  = new G.DirectionsService();
      const directionsRenderer = new G.DirectionsRenderer({
        suppressMarkers:     true,   // we use custom markers
        suppressInfoWindows: true,
        polylineOptions: {
          strokeColor:   "#3b82f6",
          strokeWeight:  6,
          strokeOpacity: 0.9,
        },
      });
      directionsRenderer.setMap(map);

      const waypointMids = stops.slice(0, 8).map((stop, idx) => ({
        location: resolveStopCoord(stop, idx, stops.length, start, dest),
        stopover: true,
      }));

      directionsService.route(
        {
          origin:      { lat: start.lat, lng: start.lon },
          destination: { lat: dest.lat,  lng: dest.lon },
          waypoints:   waypointMids,
          travelMode:  G.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            directionsRenderer.setDirections(result);
            // Decode all legs into one path for navigation animation
            const allPts: Array<{ lat: number; lng: number }> = [];
            result.routes[0].legs.forEach((leg: any) => {
              leg.steps.forEach((step: any) => {
                decodePolyline(step.encoded_lat_lngs || "").forEach(p => allPts.push(p));
                step.path?.forEach((p: any) => allPts.push({ lat: p.lat(), lng: p.lng() }));
              });
            });
            pathPointsRef.current = allPts.length > 1 ? allPts : [
              { lat: start.lat, lng: start.lon },
              { lat: dest.lat, lng: dest.lon },
            ];
          } else {
            // Fallback straight polyline
            const fallback = [
              { lat: start.lat, lng: start.lon },
              ...stops.map((s, i) => resolveStopCoord(s, i, stops.length, start, dest)),
              { lat: dest.lat, lng: dest.lon },
            ];
            const poly = new G.Polyline({
              path:          fallback,
              strokeColor:   "#3b82f6",
              strokeWeight:  6,
              strokeOpacity: 0.9,
              map,
            });
            polylineRef.current = poly;
            pathPointsRef.current = fallback;
          }
        }
      );

      // ── Fit bounds ───────────────────────────────────────────────────
      const bounds = new G.LatLngBounds();
      bounds.extend({ lat: start.lat, lng: start.lon });
      bounds.extend({ lat: dest.lat,  lng: dest.lon  });
      stops.forEach((s, i) => {
        const p = resolveStopCoord(s, i, stops.length, start, dest);
        bounds.extend(p);
      });
      map.fitBounds(bounds, { top: 80, bottom: 220, left: 40, right: 40 });

      setMapReady(true);
    }).catch(err => {
      console.error(err);
      setError("Failed to load Google Maps. Check your API key.");
    });
  }, [route, loadGoogleMaps, resolveStopCoord]);

  // ── Map type toggle ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const G = (window as any).google?.maps;
    if (!G) return;
    const types: Record<MapMode, string> = {
      default:   G.MapTypeId.ROADMAP,
      satellite: G.MapTypeId.HYBRID,   // hybrid = satellite + labels
      terrain:   G.MapTypeId.TERRAIN,
    };
    map.setMapTypeId(types[mapMode]);
    // Terrain doesn't support tilt
    if (mapMode === "terrain") map.setTilt(0);
    else if (is3D) map.setTilt(45);
  }, [mapMode, is3D]);

  // ── 3D toggle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setTilt(is3D && mapMode !== "terrain" ? 45 : 0);
  }, [is3D, mapMode]);

  // ── Traffic toggle ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = trafficLayerRef.current;
    const map = mapRef.current;
    if (!t || !map) return;
    t.setMap(showTraffic ? map : null);
  }, [showTraffic]);

  // ── Navigation animation ───────────────────────────────────────────────────
  const startNavigation = useCallback(() => {
    const map = mapRef.current;
    const path = pathPointsRef.current;
    if (!map || path.length < 2) return;

    const G = (window as any).google?.maps;
    if (!G) return;

    // Create animated car marker
    if (!carMarkerRef.current) {
      carMarkerRef.current = new G.Marker({
        position: path[0],
        map,
        icon: {
          path: "M -8 0 L 0 -14 L 8 0 L 5 0 L 5 5 L -5 5 L -5 0 Z", // arrow/car shape
          fillColor:    "#60a5fa",
          fillOpacity:  1,
          strokeColor:  "#ffffff",
          strokeWeight: 2,
          scale:        1.6,
          anchor:       new G.Point(0, 5),
          rotation:     0,
        },
        zIndex: 200,
        title: "Your Position",
      });
    }

    setIsNavigating(true);
    let idx = 0;
    const totalPts = path.length;
    const STEP_INTERVAL = 80; // ms between position updates

    const animate = () => {
      if (idx >= totalPts - 1) {
        setIsNavigating(false);
        setNavProgress(1);
        return;
      }
      idx++;
      const pos  = path[idx];
      const prev = path[idx - 1];

      // Update car position
      carMarkerRef.current?.setPosition(pos);

      // Rotate icon toward direction of travel
      const heading = G.geometry?.spherical?.computeHeading(
        new G.LatLng(prev.lat, prev.lng),
        new G.LatLng(pos.lat, pos.lng)
      ) ?? 0;
      const icon = carMarkerRef.current?.getIcon() as any;
      if (icon) { icon.rotation = heading; carMarkerRef.current?.setIcon(icon); }

      // Pan map to follow car with 3D tilt and heading
      map.moveCamera({
        center:  pos,
        zoom:    16,
        tilt:    is3D ? 60 : 0,
        heading: heading,
      });

      setNavProgress(idx / (totalPts - 1));
      animFrameRef.current = window.setTimeout(animate, STEP_INTERVAL) as any;
    };

    animate();
  }, [is3D]);

  const stopNavigation = useCallback(() => {
    clearTimeout(animFrameRef.current);
    setIsNavigating(false);
    carMarkerRef.current?.setMap(null);
    carMarkerRef.current = null;
    // Fly back to overview
    const map = mapRef.current;
    const G = (window as any).google?.maps;
    if (!map || !route || !G) return;
    const bounds = new G.LatLngBounds();
    bounds.extend({ lat: route.startCoords.lat, lng: route.startCoords.lon });
    bounds.extend({ lat: route.destCoords.lat,  lng: route.destCoords.lon });
    map.fitBounds(bounds, { top: 80, bottom: 220, left: 40, right: 40 });
    map.setTilt(45); map.setHeading(0);
    setNavProgress(0);
  }, [route]);

  const flyToOverview = useCallback(() => {
    const map = mapRef.current;
    const G   = (window as any).google?.maps;
    if (!map || !route || !G) return;
    const bounds = new G.LatLngBounds();
    bounds.extend({ lat: route.startCoords.lat, lng: route.startCoords.lon });
    bounds.extend({ lat: route.destCoords.lat,  lng: route.destCoords.lon });
    route.stops.forEach((s, i) => {
      const p = resolveStopCoord(s, i, route.stops.length, route.startCoords, route.destCoords);
      bounds.extend(p);
    });
    map.fitBounds(bounds, { top: 80, bottom: 220, left: 40, right: 40 });
    map.setTilt(is3D ? 45 : 0);
    map.setHeading(0);
  }, [route, is3D, resolveStopCoord]);

  const flyToStop = useCallback((idx: number) => {
    const map = mapRef.current;
    const m   = markersRef.current[idx];
    if (!map || !m) return;
    const pos = m.getPosition();
    map.moveCamera({ center: pos, zoom: 15, tilt: is3D ? 50 : 0, heading: 0 });
    (m as any)._iw?.open(map, m);
    setActiveStop(idx);
  }, [is3D]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative">

      {/* ── Map container ── */}
      <div ref={mapDiv} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* ── Top gradient overlay ── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)", height: 100 }} />

      {/* ── Bottom gradient overlay ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)", height: 280 }} />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Link href="/trip-planner"
            className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Live Navigation</h1>
            {route && <p className="text-white/50 text-xs">{route.distance} mi · {route.timeStr}</p>}
          </div>
        </div>

        {route && (
          <div className="flex items-center gap-2">
            {route.arrivalTime && (
              <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white/80 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Arrive {route.arrivalTime}
              </div>
            )}
            <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> {route.stops.length} Stop{route.stops.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-50 bg-background">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-xl font-bold mb-2 text-foreground">Navigation Error</p>
          <p className="text-foreground/60 mb-6 max-w-md">{error}</p>
          <Link href="/trip-planner" className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold">Back to Planner</Link>
        </div>
      )}

      {/* ── Loading state ── */}
      {!error && !mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-white/60 text-sm">Loading Google Maps 3D…</p>
          </div>
        </div>
      )}

      {/* ── Right control panel ── */}
      {mapReady && (
        <div className="absolute right-4 top-24 z-30 flex flex-col gap-2">
          {/* Map type buttons */}
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            {([
              { mode: "default" as MapMode,   Icon: Map,       label: "Road" },
              { mode: "satellite" as MapMode, Icon: Satellite, label: "Sat"  },
              { mode: "terrain" as MapMode,   Icon: Mountain,  label: "Topo" },
            ]).map(({ mode, Icon, label }) => (
              <button key={mode} onClick={() => setMapMode(mode as MapMode)}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold transition-colors ${mapMode === mode ? "bg-blue-500/30 text-blue-300" : "text-white/50 hover:bg-white/10 hover:text-white"}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* 3D toggle */}
          <button onClick={() => setIs3D(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all backdrop-blur-md ${is3D ? "bg-blue-500/30 border-blue-500/40 text-blue-300" : "bg-black/70 border-white/10 text-white/50 hover:text-white"}`}>
            <Maximize2 className="w-4 h-4" /> {is3D ? "3D ON" : "3D OFF"}
          </button>

          {/* Traffic toggle */}
          <button onClick={() => setShowTraffic(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all backdrop-blur-md ${showTraffic ? "bg-rose-500/30 border-rose-500/40 text-rose-300" : "bg-black/70 border-white/10 text-white/50 hover:text-white"}`}>
            <Route className="w-4 h-4" /> Traffic
          </button>

          {/* Overview button */}
          <button onClick={flyToOverview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-black/70 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md">
            <LocateFixed className="w-4 h-4" /> Overview
          </button>

          {/* Mute toggle */}
          <button onClick={() => setMuted(v => !v)}
            className="p-2.5 rounded-xl bg-black/70 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* ── Bottom panel ── */}
      {route && mapReady && (
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-2">

          {/* Stop chips row */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 px-3 py-2 rounded-xl shrink-0">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-black">A</div>
              <span className="text-white text-xs font-semibold">Start</span>
            </div>

            {route.stops.map((stop, idx) => (
              <button key={idx} onClick={() => flyToStop(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl shrink-0 border transition-all ${
                  activeStop === idx
                    ? "bg-emerald-500/30 border-emerald-500/60 scale-105"
                    : "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
                }`}>
                <Zap className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <p className="text-white text-xs font-semibold truncate max-w-[100px]">Stop {idx + 1}</p>
                  <p className="text-white/40 text-[10px] truncate max-w-[100px]">{stop.name.split(' - ')[0]}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />
              </button>
            ))}

            <div className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 px-3 py-2 rounded-xl shrink-0">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-black">B</div>
              <span className="text-white text-xs font-semibold">Destination</span>
            </div>
          </div>

          {/* Active stop detail */}
          {activeStop !== null && route.stops[activeStop] && (
            <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl p-4 mb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl shrink-0"><Zap className="w-5 h-5 text-emerald-400" /></div>
                  <div>
                    <p className="text-white font-bold text-sm">{route.stops[activeStop].name}</p>
                    <p className="text-white/50 text-xs mt-0.5">{route.stops[activeStop].location}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/70">
                      <span>🔋 Arrive {route.stops[activeStop].arriveWith}</span>
                      <span>⚡ Charge to {route.stops[activeStop].chargeTo}</span>
                      <span>⏱ {route.stops[activeStop].chargeTime}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveStop(null)} className="text-white/30 hover:text-white text-lg leading-none shrink-0">✕</button>
              </div>
            </div>
          )}

          {/* Navigation progress + start button */}
          <div className="flex items-center gap-3">
            {/* Navigation progress bar */}
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${navProgress * 100}%` }} />
            </div>

            {isNavigating ? (
              <button onClick={stopNavigation}
                className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-400 px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 hover:bg-red-500/30 transition-all">
                ■ Stop
              </button>
            ) : (
              <button onClick={startNavigation} disabled={!mapReady}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all disabled:opacity-50">
                <Navigation className="w-4 h-4" /> Start Drive
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: "Distance", value: `${route.distance} mi` },
              { label: "Drive Time", value: route.timeStr },
              { label: "Charge Stops", value: String(route.stops.length) },
              { label: "EV Range", value: `${route.mlEffectiveRange ?? "—"} mi` },
            ].map(s => (
              <div key={s.label} className="bg-white/6 backdrop-blur-md border border-white/8 rounded-xl p-2.5 text-center">
                <p className="text-white/40 text-[10px] mb-0.5">{s.label}</p>
                <p className="text-white font-bold text-sm">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
