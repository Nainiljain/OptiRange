"use client";

import { useState, useRef, useEffect } from "react";
import {
  saveTripWithServiceCheck, calculateTripData, runMLPredictionDirect,
  fetchNRCanStationsAction,
  saveRecentSearchAction, saveFavouriteAction, deleteFavouriteAction,
} from "@/app/actions";
import { type ChargingStation } from "@/lib/tripUtils";
import { type Stop, type RouteResult } from "@/lib/tripUtils";
import RouteChoiceModal from "@/app/components/RouteChoiceModal";
import {
  MapPin, Navigation, Battery, Activity, Loader2, Zap, Car, Map,
  CloudRain, Thermometer, Cloud, Brain, ShieldCheck, CheckCircle2,
  Info, ChevronDown, ChevronUp, Clock, Star, Home, Briefcase,
  Plus, Trash2, CalendarClock, ArrowRight, Coffee, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SavedLocation { id: string; label: string; type: string; address: string; lat: number; lon: number; }
interface RecentSearch  { address: string; lat: number; lon: number; }

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TripPlannerClient({
  user, allEvData, initialEvData, healthData, savedLocations: initSaved, recentSearches: initRecent,
}: {
  user: any; allEvData: any[]; initialEvData: any; healthData: any;
  savedLocations: SavedLocation[]; recentSearches: RecentSearch[];
}) {
  // ── Car selector ─────────────────────────────────────────────────────────
  const [selectedCar, setSelectedCar]   = useState<any>(initialEvData);
  const [showCarPicker, setShowCarPicker] = useState(false);
  const multiCar = allEvData.length > 1;

  // ── Route inputs ─────────────────────────────────────────────────────────
  const [start, setStart]           = useState("");
  const [destination, setDestination] = useState("");
  const [startCoords, setStartCoords] = useState<{lat:number;lon:number}|null>(null);
  const [destCoords, setDestCoords]   = useState<{lat:number;lon:number}|null>(null);

  // ── Departure time ────────────────────────────────────────────────────────
  const [departureTime, setDepartureTime] = useState(() => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    return now.toTimeString().slice(0, 5); // "HH:MM"
  });
  const [departureDate, setDepartureDate] = useState(() =>
    new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  );

  // ── Autocomplete ──────────────────────────────────────────────────────────
  const [startSugg, setStartSugg]       = useState<any[]>([]);
  const [destSugg, setDestSugg]         = useState<any[]>([]);
  const [showStartSugg, setShowStartSugg] = useState(false);
  const [showDestSugg, setShowDestSugg]   = useState(false);
  const startInputRef = useRef<HTMLInputElement>(null);
  const destInputRef  = useRef<HTMLInputElement>(null);

  // ── Favourites & recent ───────────────────────────────────────────────────
  const [savedLocs, setSavedLocs]       = useState<SavedLocation[]>(initSaved);
  const [recentSearches]                = useState<RecentSearch[]>(initRecent);
  const [savedToast, setSavedToast] = useState("");

  // ── Results & loading ─────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [batteryPct, setBatteryPct]   = useState<number|"">(80);
  const [weatherInfo, setWeatherInfo] = useState<any>(null);
  const [weatherPenalty, setWeatherPenalty] = useState(0);

  // ── Route preference ──────────────────────────────────────────────────────
  const [showRouteModal, setShowRouteModal]     = useState(false);
  const [routePreference, setRoutePreference]   = useState<'toll'|'free'|null>(null);
  const [pendingSubmit, setPendingSubmit]        = useState(false);

  // ── Geocode ───────────────────────────────────────────────────────────────
  const geocodeSearch = async (query: string, setSugg: Function, setShow: Function) => {
    if (query.length < 3) { setSugg([]); return; }
    try {
      const res  = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(query)}&maxLocations=5`);
      const data = await res.json();
      setSugg(data.candidates || []);
      setShow(true);
    } catch {}
  };

  const resolveCoords = async (address: string, existing: {lat:number;lon:number}|null) => {
    if (existing) return existing;
    try {
      const res  = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(address)}&maxLocations=1`);
      const data = await res.json();
      const c    = data.candidates?.[0];
      if (c) return { lat: c.location.y, lon: c.location.x };
    } catch {}
    return null;
  };

  // ── Select a suggestion ───────────────────────────────────────────────────
  const selectStart = (address: string, lat: number, lon: number) => {
    setStart(address); setStartCoords({ lat, lon }); setShowStartSugg(false); setStartSugg([]);
  };
  const selectDest = (address: string, lat: number, lon: number) => {
    setDestination(address); setDestCoords({ lat, lon }); setShowDestSugg(false); setDestSugg([]);
    setRoutePreference(null); // reset so modal shows again for new destination
  };

  // ── Quick-save favourite — no form, saves instantly with address first word as label ──
  const quickSaveFav = async (field: 'start' | 'dest') => {
    const addr  = field === 'start' ? start : destination;
    const coord = field === 'start' ? startCoords : destCoords;
    if (!addr) return;
    // Auto-label = first part of address (city or street name)
    const autoLabel = addr.split(',')[0].trim().slice(0, 24);
    let finalCoord = coord;
    if (!finalCoord) {
      try {
        const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(addr)}&maxLocations=1`);
        const data = await res.json();
        const c = data.candidates?.[0];
        if (c) finalCoord = { lat: c.location.y, lon: c.location.x };
      } catch {}
    }
    if (!finalCoord) return;
    await saveFavouriteAction(autoLabel, 'favourite', addr, finalCoord.lat, finalCoord.lon);
    const newLoc: SavedLocation = { id: Date.now().toString(), label: autoLabel, type: 'favourite', address: addr, lat: finalCoord.lat, lon: finalCoord.lon };
    setSavedLocs(prev => [...prev, newLoc]);
    setSavedToast(`"${autoLabel}" saved to favourites ✓`);
    setTimeout(() => setSavedToast(""), 2500);
  };

  const handleDeleteFav = async (id: string) => {
    await deleteFavouriteAction(id);
    setSavedLocs(prev => prev.filter(l => l.id !== id));
  };

  // ── Compute arrival time ──────────────────────────────────────────────────
  const computeArrival = (durationMins: number, chargingStops: number) => {
    const [h, m]   = departureTime.split(':').map(Number);
    const depDate  = new Date(departureDate);
    depDate.setHours(h, m, 0, 0);
    const chargingMins = chargingStops * 25;
    const totalMins    = durationMins + chargingMins;
    const arrival      = new Date(depDate.getTime() + totalMins * 60_000);
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── Plan trip — show route choice modal first ─────────────────────────────
  const handlePlanTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    // Show route modal if preference not yet chosen
    if (!routePreference) {
      setPendingSubmit(true);
      setShowRouteModal(true);
      return;
    }
    await executePlanTrip(routePreference);
  };

  const handleRouteSelect = async (pref: 'toll' | 'free') => {
    setRoutePreference(pref);
    setShowRouteModal(false);
    setPendingSubmit(false);
    await executePlanTrip(pref);
  };

  const executePlanTrip = async (pref: 'toll' | 'free') => {
    setLoading(true); setWeatherInfo(null); setWeatherPenalty(0);
    try {
      setLoadingStep("Resolving locations…");
      const sCoords = await resolveCoords(start, startCoords);
      const dCoords = await resolveCoords(destination, destCoords);
      if (!sCoords || !dCoords) { alert("Could not locate one of the addresses."); setLoading(false); return; }
      setStartCoords(sCoords); setDestCoords(dCoords);

      // Save both to recent searches
      await saveRecentSearchAction(start, sCoords.lat, sCoords.lon);
      await saveRecentSearchAction(destination, dCoords.lat, dCoords.lon);

      setLoadingStep("Fetching live weather data…");
      let wInfo = null; let wPenalty = 0;
      try {
        const wRes  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${dCoords.lat}&longitude=${dCoords.lon}&current_weather=true`);
        const wData = await wRes.json();
        if (wData?.current_weather) {
          wInfo = wData.current_weather; setWeatherInfo(wInfo);
          if (wInfo.temperature < 10) wPenalty += 0.15;
          if (wInfo.temperature > 35) wPenalty += 0.10;
          if (wInfo.weathercode >= 50) wPenalty += 0.05;
          setWeatherPenalty(wPenalty);
        }
      } catch {}

      setLoadingStep("Calculating route via Google Maps…");
      const serverStats = await calculateTripData(sCoords.lat, sCoords.lon, dCoords.lat, dCoords.lon, pref);
      const distance    = serverStats.drivingDistance;
      const timeHrs     = Math.floor(serverStats.durationMinutes / 60);
      const timeMins    = serverStats.durationMinutes % 60;
      const timeStr     = `${timeHrs}h ${timeMins}m`;

      setLoadingStep("Running ML prediction model…");
      const currentChargePct  = typeof batteryPct === "number" ? batteryPct : 80;
      const effectiveBattery  = (currentChargePct / 100) * selectedCar.batteryCapacity;
      const mlResult          = await runMLPredictionDirect(effectiveBattery, distance, wPenalty, healthData);
      const batteryUsed       = Math.min(effectiveBattery, distance / 4.5);
      const numStops          = mlResult.stops;
      const effectiveRange    = mlResult.effective_range_miles;

      let maxStretch = healthData?.preferredRestInterval || 120;
      if (["back_pain","pregnancy","bladder"].includes(healthData?.healthCondition)) maxStretch *= 0.9;

      setLoadingStep("Fetching real charging stations along your route…");
      // fetchNRCanStationsAction now derives road-accurate waypoints internally
      // via the Directions API — we just tell it how many stops we need
      const waypointCoords = numStops > 0
        ? Array.from({ length: numStops }, (_, i) => ({
            lat: sCoords.lat + (dCoords.lat - sCoords.lat) * ((i + 1) / (numStops + 1)),
            lon: sCoords.lon + (dCoords.lon - sCoords.lon) * ((i + 1) / (numStops + 1)),
          }))
        : [];

      let nrcanStations: ChargingStation[][] = [];
      if (waypointCoords.length > 0) {
        try { nrcanStations = await fetchNRCanStationsAction(waypointCoords, sCoords, dCoords, pref); } catch {}
      }

      // ── Rest stop intervals based on health profile ────────────────────────
      // Every preferredRestInterval minutes, inject a rest stop (with charging if available)
      const restIntervalMins = healthData?.preferredRestInterval || 120;
      const needsFrequentRests = ["back_pain","pregnancy","bladder","chronic_fatigue"]
        .includes(healthData?.healthCondition || '');
      const effectiveRestMins = needsFrequentRests ? restIntervalMins * 0.85 : restIntervalMins;

      // Calculate rest stop positions (based on time, not distance)
      const totalDriveMins = serverStats.durationMinutes;
      const restStopTimes: number[] = []; // minutes into trip when rest is needed
      let elapsed = effectiveRestMins;
      while (elapsed < totalDriveMins - 20) { // don't add rest stop in last 20 mins
        restStopTimes.push(elapsed);
        elapsed += effectiveRestMins;
      }

      // ── Build unified stop list: charge stops + rest stops merged ────────────
      const stops: Stop[] = [];
      let remainingDist   = distance;
      let currentRange    = effectiveRange;
      let minutesTravelled = 0;
      const avgSpeedMph   = distance / (serverStats.durationMinutes / 60); // real avg speed
      let nextRestAt      = restStopTimes[0] ?? Infinity;
      let restIdx         = 0;
      let chargeStopIdx   = 0;

      while (remainingDist > 20) {
        // Minutes to drive currentRange (or rest interval, whichever comes first)
        const minsToEmpty    = (currentRange / avgSpeedMph) * 60;
        const minsToNextRest = nextRestAt - minutesTravelled;

        const needsCharge = currentRange - 20 < remainingDist;
        const needsRest   = minsToNextRest <= minsToEmpty && restStopTimes.length > 0;

        if (!needsCharge && !needsRest) break; // no more stops needed

        // Decide which comes first
        const doRestFirst = needsRest && (!needsCharge || minsToNextRest < minsToEmpty);

        if (doRestFirst) {
          // ── REST STOP (with charging if available) ─────────────────────
          const distCovered    = (minsToNextRest / 60) * avgSpeedMph;
          remainingDist       -= distCovered;
          minutesTravelled     = nextRestAt;
          currentRange        -= distCovered;

          // Advance rest tracker
          restIdx++;
          nextRestAt = restStopTimes[restIdx] ?? Infinity;

          // Get charging station near this rest point
          const fraction   = 1 - (remainingDist / distance);
          const restLat    = sCoords.lat + (dCoords.lat - sCoords.lat) * fraction;
          const restLon    = sCoords.lon + (dCoords.lon - sCoords.lon) * fraction;
          const stationOpts = (nrcanStations[chargeStopIdx] || []);
          const hasCharger  = stationOpts.length > 0;
          const bestStation = stationOpts.find((s: ChargingStation) => s.dcFastPorts > 0 || s.level2Ports > 0) || stationOpts[0];

          const condition = healthData?.healthCondition || 'none';
          const restReasons: Record<string, string> = {
            back_pain:       '🧘 Back stretch break',
            pregnancy:       '🤰 Comfort break',
            bladder:         '🚻 Washroom break',
            chronic_fatigue: '😴 Fatigue rest stop',
          };
          const restReason = restReasons[condition] || '☕ Rest stop';

          const routeLabel = pref === 'free'
            ? `ONroute Service Centre — Hwy 401`
            : `Highway Rest Area — ETR 407`;

          stops.push({
            name: hasCharger
              ? `${restReason} + Charge — ${bestStation.name}`
              : `${restReason} — ${routeLabel}`,
            location: hasCharger
              ? `${bestStation.address}${bestStation.city ? ', ' + bestStation.city : ''}${bestStation.province ? ', ' + bestStation.province : ''}`
              : `${routeLabel} · ~${Math.round(distCovered)} mi from last stop`,
            arriveWith: `${Math.max(10, Math.floor((currentRange / effectiveRange) * 100))}%`,
            chargeTime: hasCharger
              ? (bestStation.dcFastPorts > 0 ? '20–25 mins (DCFC + rest)' : '30 mins (L2 + rest)')
              : '15 mins (rest only)',
            chargeTo: hasCharger ? '80%' : `${Math.max(10, Math.floor((currentRange / effectiveRange) * 100))}%`,
            station:  bestStation || null,
            stopType: hasCharger ? 'rest+charge' : 'rest',
          } as any);

          if (hasCharger) {
            currentRange = effectiveRange * 0.8;
            chargeStopIdx++;
          }

        } else {
          // ── CHARGE STOP ───────────────────────────────────────────────────
          const distToCharge  = Math.max(0, currentRange - 20);
          remainingDist      -= distToCharge;
          minutesTravelled   += (distToCharge / avgSpeedMph) * 60;
          currentRange        = 0;

          if (remainingDist <= 0) break;

          const stationOpts = nrcanStations[chargeStopIdx] || [];
          const best        = stationOpts.find((s: ChargingStation) => s.dcFastPorts > 0) || stationOpts[0];
          const hasStation  = !!best;

          stops.push({
            name:      hasStation ? best.name : `⚡ Fast Charge — ${pref === 'free' ? 'Hwy 401 Corridor' : 'ETR 407 Corridor'}`,
            location:  hasStation
              ? `${best.address}${best.city ? ', ' + best.city : ''}${best.province ? ', ' + best.province : ''}`
              : `Near route milestone — ${Math.round(distance - remainingDist)} mi`,
            arriveWith: '15%',
            chargeTime: hasStation && best.dcFastPorts > 0 ? '25 mins (DC Fast Charge)' : '35 mins (Level 2)',
            chargeTo:   '80%',
            station:    best || null,
            stopType:   'charge',
          } as any);

          currentRange   = effectiveRange * 0.8;
          chargeStopIdx++;
        }
      }

      const arrivalTime = computeArrival(serverStats.durationMinutes, stops.length);

      const result: RouteResult = {
        distance, timeStr, batteryUsed, stops,
        startCoords: sCoords, destCoords: dCoords,
        distanceSource: serverStats.source,
        mlStatus: mlResult.status,
        mlHealthAdvice: mlResult.health_advice,
        mlEffectiveRange: mlResult.effective_range_miles,
        arrivalTime,
        departureTime: `${departureDate} ${departureTime}`,
        routePreference: pref,
        routeLabel: pref === 'free' ? 'Hwy 401 (Toll-Free)' : 'ETR 407 (Toll)',
        restStopCount: stops.filter((s: any) => s.stopType === 'rest' || s.stopType === 'rest+charge').length,
        chargeStopCount: stops.filter((s: any) => s.stopType === 'charge' || s.stopType === 'rest+charge').length,
      } as any;

      setRouteResult(result);
      sessionStorage.setItem("currentRoute", JSON.stringify(result));
      await saveTripWithServiceCheck(
        start, destination, distance, timeStr, batteryUsed, stops.length,
        selectedCar._id,
        sCoords.lat, sCoords.lon
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); setLoadingStep(""); }
  };

  // ── Google Maps embed ─────────────────────────────────────────────────────
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
  const hasGoogleKey  = googleMapsKey && !googleMapsKey.startsWith("YOUR_");
  const getMapEmbedUrl = () => {
    if (!routeResult?.startCoords || !routeResult?.destCoords) return null;
    const { startCoords: sc, destCoords: dc } = routeResult;
    if (hasGoogleKey) {
      const wp = routeResult.stops.filter(s => (s as any).station).map(s => `${(s as any).station.lat},${(s as any).station.lon}`).join("|");
      return `https://www.google.com/maps/embed/v1/directions?key=${googleMapsKey}&origin=${sc.lat},${sc.lon}&destination=${dc.lat},${dc.lon}${wp ? `&waypoints=${wp}` : ""}&mode=driving`;
    }
    return `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(sc.lon,dc.lon)-0.5},${Math.min(sc.lat,dc.lat)-0.5},${Math.max(sc.lon,dc.lon)+0.5},${Math.max(sc.lat,dc.lat)+0.5}&layer=mapnik`;
  };
  const mapEmbedUrl = routeResult ? getMapEmbedUrl() : null;

  // ── Favourite icon helper ─────────────────────────────────────────────────
  const FavIcon = ({ type }: { type: string }) =>
    type === 'home' ? <Home className="w-3.5 h-3.5" /> :
    type === 'work' ? <Briefcase className="w-3.5 h-3.5" /> :
    <Star className="w-3.5 h-3.5" />;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Route choice modal */}
      <RouteChoiceModal
        isOpen={showRouteModal}
        onClose={() => { setShowRouteModal(false); setPendingSubmit(false); }}
        onSelect={handleRouteSelect}
      />
    <div className="flex flex-col xl:flex-row gap-8">

      {/* ── Left: Form ──────────────────────────────────────────────────── */}
      <div className="w-full xl:w-1/3 shrink-0 space-y-4">
        <div className="glass-panel p-6 rounded-2xl shadow-xl relative overflow-visible">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          <form onSubmit={handlePlanTrip} className="space-y-5">

            {/* ── Route inputs ──────────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider">Route Details</h3>

              {/* ── Saved places bar — always visible ──────────────── */}
              <div className="flex flex-wrap gap-2 min-h-[32px] items-center">
                {/* Home shortcut */}
                {savedLocs.find(l => l.type === 'home') ? (
                  <button type="button"
                    onClick={() => selectDest(savedLocs.find(l => l.type === 'home')!.address, savedLocs.find(l => l.type === 'home')!.lat, savedLocs.find(l => l.type === 'home')!.lon)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-all border border-blue-500/20">
                    <Home className="w-3.5 h-3.5" /> Home
                  </button>
                ) : (
                  <button type="button" onClick={async () => {
                    const addr = destination || start;
                    if (!addr) { alert("Type a destination address first, then click Add Home."); return; }
                    const coord = destination ? destCoords : startCoords;
                    let fc = coord;
                    if (!fc && addr) {
                      try {
                        const r = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(addr)}&maxLocations=1`);
                        const data = await r.json();
                        const c = data.candidates?.[0];
                        if (c) fc = { lat: c.location.y, lon: c.location.x };
                      } catch {}
                    }
                    if (!fc) return;
                    await saveFavouriteAction("Home", "home", addr, fc.lat, fc.lon);
                    setSavedLocs(prev => [...prev.filter(l => l.type !== "home"), { id: Date.now().toString(), label: "Home", type: "home", address: addr, lat: fc!.lat, lon: fc!.lon }]);
                    setSavedToast("Home address saved ✓");
                    setTimeout(() => setSavedToast(""), 2500);
                  }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 text-foreground/30 text-xs font-semibold hover:bg-blue-500/10 hover:text-blue-400 transition-all border border-dashed border-foreground/10 hover:border-blue-500/30">
                    <Home className="w-3.5 h-3.5" /> Add Home
                  </button>
                )}

                {/* Work shortcut */}
                {savedLocs.find(l => l.type === 'work') ? (
                  <button type="button"
                    onClick={() => selectDest(savedLocs.find(l => l.type === 'work')!.address, savedLocs.find(l => l.type === 'work')!.lat, savedLocs.find(l => l.type === 'work')!.lon)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-all border border-purple-500/20">
                    <Briefcase className="w-3.5 h-3.5" /> Work
                  </button>
                ) : (
                  <button type="button" onClick={async () => {
                    const addr = destination || start;
                    if (!addr) { alert("Type a destination address first, then click Add Work."); return; }
                    const coord = destination ? destCoords : startCoords;
                    let fc = coord;
                    if (!fc && addr) {
                      try {
                        const r = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(addr)}&maxLocations=1`);
                        const data = await r.json();
                        const c = data.candidates?.[0];
                        if (c) fc = { lat: c.location.y, lon: c.location.x };
                      } catch {}
                    }
                    if (!fc) return;
                    await saveFavouriteAction("Work", "work", addr, fc.lat, fc.lon);
                    setSavedLocs(prev => [...prev.filter(l => l.type !== "work"), { id: Date.now().toString(), label: "Work", type: "work", address: addr, lat: fc!.lat, lon: fc!.lon }]);
                    setSavedToast("Work address saved ✓");
                    setTimeout(() => setSavedToast(""), 2500);
                  }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 text-foreground/30 text-xs font-semibold hover:bg-purple-500/10 hover:text-purple-400 transition-all border border-dashed border-foreground/10 hover:border-purple-500/30">
                    <Briefcase className="w-3.5 h-3.5" /> Add Work
                  </button>
                )}

                {/* Other saved favourites */}
                {savedLocs.filter(l => l.type === 'favourite').map(loc => (
                  <button key={loc.id} type="button"
                    onClick={() => selectDest(loc.address, loc.lat, loc.lon)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-semibold hover:bg-yellow-500/20 transition-all border border-yellow-500/20">
                    <Star className="w-3.5 h-3.5" /> {loc.label}
                  </button>
                ))}
              </div>

              {/* Start input */}
              <div className="relative z-50">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                <input type="text" required placeholder="Starting location" value={start}
                  ref={startInputRef}
                  onFocus={() => { if (startSugg.length || recentSearches.length) setShowStartSugg(true); }}
                  onBlur={() => setTimeout(() => setShowStartSugg(false), 200)}
                  onChange={e => { setStart(e.target.value); geocodeSearch(e.target.value, setStartSugg, setShowStartSugg); }}
                  className="w-full bg-background/50 border border-border rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
                {start && (
                  <button type="button" onClick={() => quickSaveFav('start')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-foreground/30 hover:text-yellow-400 transition-colors" title="Save to favourites">
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <AnimatePresence>
                  {showStartSugg && (startSugg.length > 0 || recentSearches.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto">
                      {/* Recent searches */}
                      {recentSearches.length > 0 && startSugg.length === 0 && (
                        <>
                          <p className="px-4 pt-3 pb-1 text-xs font-bold text-foreground/40 uppercase tracking-wider">Recent</p>
                          {recentSearches.map((r, i) => (
                            <div key={i} onClick={() => selectStart(r.address, r.lat, r.lon)}
                              className="px-4 py-2.5 hover:bg-secondary cursor-pointer flex items-center gap-3 border-b border-border last:border-0">
                              <Clock className="w-4 h-4 text-foreground/30 shrink-0" />
                              <p className="text-sm font-medium truncate">{r.address}</p>
                            </div>
                          ))}
                        </>
                      )}
                      {/* Geocode suggestions */}
                      {startSugg.map((s, i) => (
                        <div key={i} onClick={() => selectStart(s.address, s.location.y, s.location.x)}
                          className="px-4 py-3 hover:bg-secondary cursor-pointer border-b border-border last:border-0">
                          <p className="font-bold text-sm truncate">{s.address.split(',')[0]}</p>
                          <p className="text-xs text-foreground/50 truncate">{s.address.split(',').slice(1).join(',').trim()}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Destination input */}
              <div className="relative z-40">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
                <input type="text" required placeholder="Destination" value={destination}
                  ref={destInputRef}
                  onFocus={() => { if (destSugg.length || recentSearches.length) setShowDestSugg(true); }}
                  onBlur={() => setTimeout(() => setShowDestSugg(false), 200)}
                  onChange={e => { setDestination(e.target.value); geocodeSearch(e.target.value, setDestSugg, setShowDestSugg); }}
                  className="w-full bg-background/50 border border-border rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                />
                {destination && (
                  <button type="button" onClick={() => quickSaveFav('dest')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-foreground/30 hover:text-yellow-400 transition-colors" title="Save to favourites">
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <AnimatePresence>
                  {showDestSugg && (destSugg.length > 0 || recentSearches.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto">
                      {recentSearches.length > 0 && destSugg.length === 0 && (
                        <>
                          <p className="px-4 pt-3 pb-1 text-xs font-bold text-foreground/40 uppercase tracking-wider">Recent</p>
                          {recentSearches.map((r, i) => (
                            <div key={i} onClick={() => selectDest(r.address, r.lat, r.lon)}
                              className="px-4 py-2.5 hover:bg-secondary cursor-pointer flex items-center gap-3 border-b border-border last:border-0">
                              <Clock className="w-4 h-4 text-foreground/30 shrink-0" />
                              <p className="text-sm font-medium truncate">{r.address}</p>
                            </div>
                          ))}
                        </>
                      )}
                      {destSugg.map((s, i) => (
                        <div key={i} onClick={() => selectDest(s.address, s.location.y, s.location.x)}
                          className="px-4 py-3 hover:bg-secondary cursor-pointer border-b border-border last:border-0">
                          <p className="font-bold text-sm truncate">{s.address.split(',')[0]}</p>
                          <p className="text-xs text-foreground/50 truncate">{s.address.split(',').slice(1).join(',').trim()}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>



              {/* Toast notification */}
              {savedToast && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 shrink-0" /> {savedToast}
                </div>
              )}

              {/* Saved locations list with delete */}
              {savedLocs.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Saved Places</p>
                  {savedLocs.map(loc => (
                    <div key={loc.id} className="flex items-center gap-2 group">
                      <button type="button" onClick={() => selectDest(loc.address, loc.lat, loc.lon)}
                        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-all text-left">
                        <div className={`p-1.5 rounded-lg ${loc.type === 'home' ? 'bg-blue-500/10 text-blue-400' : loc.type === 'work' ? 'bg-purple-500/10 text-purple-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          <FavIcon type={loc.type} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{loc.label}</p>
                          <p className="text-xs text-foreground/40 truncate">{loc.address}</p>
                        </div>
                      </button>
                      <button type="button" onClick={() => handleDeleteFav(loc.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-foreground/30 hover:text-red-400 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* ── Departure time ─────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-2">
                <CalendarClock className="w-4 h-4" /> Departure Time
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-foreground/50 font-semibold">Date</label>
                  <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)}
                    min={new Date().toISOString().slice(0,10)}
                    className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-foreground/50 font-semibold">Time</label>
                  <input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* ── Vehicle selector ───────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider">
                {multiCar ? "Select Vehicle" : "Active Vehicle"}
              </h3>
              <div onClick={() => multiCar && setShowCarPicker(v => !v)}
                className={`p-4 bg-secondary/50 rounded-xl border transition-all ${multiCar ? 'border-blue-500/30 cursor-pointer hover:border-blue-500/60' : 'border-border cursor-default'}`}>
                <div className="flex items-center gap-3">
                  {selectedCar.carPic ? (
                    <img src={selectedCar.carPic} alt="Car" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg shrink-0"><Car className="w-5 h-5" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    {selectedCar.nickname && <p className="text-xs font-bold text-blue-400 truncate">{selectedCar.nickname}</p>}
                    <p className="font-bold truncate">{selectedCar.make} {selectedCar.model}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">{selectedCar.batteryCapacity} kWh · {selectedCar.rangeAtFull} km range</p>
                  </div>
                  {multiCar && <div className="text-foreground/40 shrink-0">
                    {showCarPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>}
                </div>
              </div>

              <AnimatePresence>
                {showCarPicker && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                    <p className="px-4 pt-3 pb-2 text-xs font-bold text-foreground/40 uppercase tracking-wider">Choose a vehicle</p>
                    {allEvData.map((car: any) => (
                      <div key={car._id} onClick={() => { setSelectedCar(car); setShowCarPicker(false); setRouteResult(null); setBatteryPct(80); }}
                        className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-t border-border hover:bg-secondary ${selectedCar._id === car._id ? 'bg-blue-500/10' : ''}`}>
                        {car.carPic ? (
                          <img src={car.carPic} alt="Car" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg shrink-0"><Car className="w-4 h-4" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          {car.nickname && <p className="text-xs text-blue-400 font-semibold truncate">{car.nickname}</p>}
                          <p className="font-semibold text-sm truncate">{car.make} {car.model}</p>
                          <p className="text-xs text-foreground/40">{car.batteryCapacity} kWh · {car.rangeAtFull} km</p>
                        </div>
                        {selectedCar._id === car._id && <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Battery slider */}
              <div className="p-4 bg-secondary/30 rounded-xl border border-border space-y-2">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-foreground/60 font-semibold">Current Charge (%)</span>
                  <input type="number" required min="1" max="100" value={batteryPct}
                    onChange={e => setBatteryPct(e.target.value === "" ? "" : parseInt(e.target.value))}
                    className="w-20 bg-background border border-border rounded-lg text-center font-bold text-blue-500 py-1.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="80" />
                </div>
                <input type="range" min="1" max="100" value={batteryPct || 80}
                  onChange={e => setBatteryPct(parseInt(e.target.value))}
                  className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <p className="text-xs text-foreground/40 text-right font-medium">
                  Est: {typeof batteryPct === "number" ? ((batteryPct/100)*selectedCar.batteryCapacity).toFixed(1) : "0.0"} kWh available
                </p>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-md font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50 group">
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> {loadingStep || "Analyzing Route…"}</>
              ) : (
                <><Navigation className="h-5 w-5 group-hover:rotate-12 transition-transform" /> Generate Eco Route</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Right: Results ───────────────────────────────────────────────── */}
      <div className="w-full xl:w-2/3">
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-panel border-dashed p-12 rounded-3xl flex flex-col items-center justify-center min-h-[500px]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
              <Zap className="h-12 w-12 text-blue-500 animate-bounce relative z-10" />
            </div>
            <p className="text-lg font-semibold animate-pulse text-foreground/80">{loadingStep || "Planning your route…"}</p>
            <div className="mt-6 flex gap-3 text-sm text-foreground/40">
              <span className="flex items-center gap-1.5"><Brain className="w-4 h-4" /> ML Engine</span>
              <span>·</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> NRCan Stations</span>
              <span>·</span>
              <span className="flex items-center gap-1.5"><Map className="w-4 h-4" /> Google Maps</span>
            </div>
          </motion.div>
        ) : routeResult ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* ML Health Advisory */}
            {routeResult.mlHealthAdvice && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  (routeResult as any).mlHealthAdvice?.includes("🚨") ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : (routeResult as any).mlHealthAdvice?.includes("⚠️") ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
                <Brain className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-70">ML Health Advisory</p>
                  <p className="font-semibold text-sm">{(routeResult as any).mlHealthAdvice}</p>
                </div>
              </motion.div>
            )}

            {/* Departure → Arrival timing banner */}
            {(routeResult as any).arrivalTime && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-4 rounded-2xl border border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl"><Clock className="w-5 h-5 text-blue-400" /></div>
                  <div>
                    <p className="text-xs text-foreground/50 font-semibold uppercase tracking-wider mb-0.5">Departure</p>
                    <p className="font-bold">{departureTime} <span className="text-foreground/50 text-sm font-normal">on {new Date(departureDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-foreground/20" />
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-foreground/50 font-semibold uppercase tracking-wider mb-0.5 text-right">Estimated Arrival</p>
                    <p className="font-bold text-emerald-400">{(routeResult as any).arrivalTime} <span className="text-foreground/50 text-sm font-normal">+{routeResult.stops.length * 25} min charging</span></p>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-xl"><Navigation className="w-5 h-5 text-emerald-400" /></div>
                </div>
              </motion.div>
            )}

            {/* Map */}
            <div className="h-[380px] glass-panel rounded-3xl relative overflow-hidden">
              {weatherInfo && (
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="absolute top-4 left-4 bg-background/90 backdrop-blur-xl border border-border p-3 rounded-xl flex items-center gap-3 shadow-xl z-20">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                    {weatherInfo.weathercode >= 50 ? <CloudRain className="w-5 h-5" /> : <Thermometer className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider mb-0.5">Dest. Weather</p>
                    <p className="font-bold text-sm">{weatherInfo.temperature}°C <span className="text-foreground/60 font-medium">· {weatherInfo.windspeed} km/h</span></p>
                    {weatherPenalty > 0 && <p className="text-xs text-rose-500 font-semibold">−{(weatherPenalty*100).toFixed(0)}% range penalty</p>}
                  </div>
                </motion.div>
              )}
              <div className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur-md border border-border px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                {(routeResult as any).distanceSource === "google_maps"
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Google Maps</>
                  : <><Info className="w-3.5 h-3.5 text-yellow-500" /> Haversine estimate</>}
              </div>
              {mapEmbedUrl ? (
                <iframe src={mapEmbedUrl} className="w-full h-full border-0" allowFullScreen loading="lazy" title="Route Map" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                  <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
                  <div className="absolute top-1/2 left-1/4 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.8)] z-10"><div className="w-2 h-2 bg-white rounded-full" /></div>
                  <div className="absolute top-1/4 right-1/4 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.8)] z-10"><MapPin className="w-3 h-3 text-white" /></div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <path d="M 25% 50% Q 35% 20% 45% 40% T 65% 30% T 75% 25%" stroke="rgba(59,130,246,0.6)" strokeWidth="4" fill="none" strokeDasharray="10 10" />
                  </svg>
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-xl border border-border p-4 rounded-2xl flex items-center justify-between shadow-2xl z-20">
                <div className="flex items-center gap-5">
                  <div><p className="text-xs text-foreground/50 font-semibold mb-0.5">Distance</p><p className="font-bold text-lg">{routeResult.distance} mi</p></div>
                  <div className="w-px h-8 bg-border hidden md:block" />
                  <div className="hidden md:block"><p className="text-xs text-foreground/50 font-semibold mb-0.5">Drive Time</p><p className="font-bold text-lg">{routeResult.timeStr}</p></div>
                  <div className="w-px h-8 bg-border hidden lg:block" />
                  <div className="hidden lg:block"><p className="text-xs text-foreground/50 font-semibold mb-0.5">ML Range</p><p className="font-bold text-lg text-blue-400">{(routeResult as any).mlEffectiveRange} mi</p></div>
                  <div className="w-px h-8 bg-border hidden lg:block" />
                  <div className="hidden lg:block"><p className="text-xs text-foreground/50 font-semibold mb-0.5">Stops</p><p className="font-bold text-lg">{routeResult.stops.length}</p></div>
                </div>
                <button type="button" onClick={() => window.location.href="/live-map"}
                  className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0">
                  <Navigation className="h-4 w-4" /> Start Trip
                </button>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex gap-3 flex-wrap">
              {/* Route badge */}
              {(routeResult as any).routeLabel && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
                  (routeResult as any).routePreference === 'free'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  <Navigation className="w-4 h-4" /> {(routeResult as any).routeLabel}
                </div>
              )}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${(routeResult as any).mlStatus === "Reachable" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-orange-500/10 text-orange-400 border-orange-500/30"}`}>
                <Brain className="w-4 h-4" /> ML: {(routeResult as any).mlStatus}
              </div>
              {(routeResult as any).restStopCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border bg-purple-500/10 text-purple-400 border-purple-500/30">
                  <Coffee className="w-4 h-4" /> {(routeResult as any).restStopCount} rest stop{(routeResult as any).restStopCount !== 1 ? 's' : ''}
                </div>
              )}
              {weatherPenalty > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/30">
                  <Cloud className="w-4 h-4" /> Weather −{(weatherPenalty*100).toFixed(0)}% range
                </div>
              )}
            </div>

            {/* Stops — charge + rest */}
            {routeResult.stops.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    <Zap className="text-yellow-500" /> Route Stops
                  </h3>
                  <span className="text-xs text-foreground/40 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> NRCan verified
                  </span>
                </div>
                {routeResult.stops.map((stop, i) => {
                  const stopType = (stop as any).stopType || 'charge';
                  const isRest       = stopType === 'rest';
                  const isRestCharge = stopType === 'rest+charge';
                  const isCharge     = stopType === 'charge';

                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`glass-panel p-5 rounded-2xl transition-colors border-l-4 ${
                        isRest       ? 'border-l-purple-500 hover:bg-purple-500/5' :
                        isRestCharge ? 'border-l-blue-400 hover:bg-blue-500/5' :
                                       'border-l-yellow-500 hover:bg-secondary/50'
                      }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl mt-0.5 shrink-0 ${
                            isRest       ? 'bg-purple-500/10 text-purple-400' :
                            isRestCharge ? 'bg-blue-500/10 text-blue-400' :
                                           'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {isRest ? <Coffee className="h-5 w-5" /> :
                             isRestCharge ? <Zap className="h-5 w-5" /> :
                             <Battery className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h4 className="font-bold text-sm">{stop.name}</h4>
                              {isRest && (
                                <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-semibold">Rest</span>
                              )}
                              {isRestCharge && (
                                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">Rest + Charge</span>
                              )}
                              {isCharge && (
                                <span className="text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full font-semibold">Charge</span>
                              )}
                              {(stop as any).station && (
                                <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">NRCan</span>
                              )}
                            </div>
                            <p className="text-sm text-foreground/60">{stop.location}</p>
                            {(stop as any).station && (
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-foreground/40 font-medium">
                                {(stop as any).station.dcFastPorts > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-yellow-500" /> {(stop as any).station.dcFastPorts} DCFC
                                  </span>
                                )}
                                {(stop as any).station.level2Ports > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Battery className="w-3 h-3 text-blue-400" /> {(stop as any).station.level2Ports} L2
                                  </span>
                                )}
                                {(stop as any).station.network && (
                                  <span className="text-foreground/30">{(stop as any).station.network}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold text-sm ${isRest ? 'text-purple-400' : isRestCharge ? 'text-blue-400' : 'text-emerald-400'}`}>
                            {stop.chargeTime}
                          </p>
                          {stop.chargeTo && !isRest && (
                            <p className="text-xs text-foreground/50 mt-0.5">Charge to {stop.chargeTo}</p>
                          )}
                          <p className="text-xs text-foreground/40 mt-0.5">Arrive at {stop.arriveWith}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                  <Activity className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-xl mb-2">Direct Journey Possible</h3>
                <p className="text-foreground/60 max-w-md">
                  Your {selectedCar.make} {selectedCar.model} has enough charge to reach the destination without stopping.
                  ML-verified range: <strong className="text-foreground">{(routeResult as any).mlEffectiveRange} mi</strong>.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="glass-panel border-dashed p-12 rounded-3xl flex flex-col items-center justify-center min-h-[500px] text-center">
            <Map className="h-16 w-16 text-foreground/20 mb-6" />
            <h3 className="text-2xl font-bold mb-3">Ready to Plan</h3>
            <p className="text-foreground/60 max-w-md mb-6">Enter your destination and we will craft the perfect route powered by our ML engine with live NRCan charging data.</p>
            <div className="flex gap-4 text-xs text-foreground/30 font-medium">
              <span className="flex items-center gap-1.5"><Brain className="w-4 h-4" /> ML Prediction</span>
              <span>·</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> NRCan Stations</span>
              <span>·</span>
              <span className="flex items-center gap-1.5"><Map className="w-4 h-4" /> Google Maps Route</span>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
