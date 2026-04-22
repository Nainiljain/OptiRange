"use client";

import { useState } from "react";
import { saveTripData, calculateTripData } from "@/app/actions";
import { MapPin, Navigation, Battery, Activity, Loader2, ArrowRight, Zap, Car, Map, CloudRain, Thermometer, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Stop {
    name: string;
    location: string;
    arriveWith: string;
    chargeTime: string;
    chargeTo: string;
}

interface RouteResult {
    distance: number;
    timeStr: string;
    batteryUsed: number;
    stops: Stop[];
    startCoords?: { lat: number, lon: number };
    destCoords?: { lat: number, lon: number };
}

export default function TripPlannerClient({ user, evData, healthData }: { user: any, evData: any, healthData: any }) {
    const [start, setStart] = useState("");
    const [destination, setDestination] = useState("");
    const [loading, setLoading] = useState(false);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
    const [batteryPct, setBatteryPct] = useState<number | "">("");

    // Autocomplete & Weather State
    const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
    const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
    const [showStartSugg, setShowStartSugg] = useState(false);
    const [showDestSugg, setShowDestSugg] = useState(false);
    const [startCoords, setStartCoords] = useState<{lat: number, lon: number} | null>(null);
    const [destCoords, setDestCoords] = useState<{lat: number, lon: number} | null>(null);
    const [weatherInfo, setWeatherInfo] = useState<any>(null);
    const [weatherPenalty, setWeatherPenalty] = useState<number>(0);

    const handleSearch = async (query: string, setSugg: Function, setShow: Function) => {
        if (query.length < 3) {
            setSugg([]);
            return;
        }
        try {
            const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(query)}&maxLocations=5`);
            const data = await res.json();
            setSugg(data.candidates || []);
            setShow(true);
        } catch (e) {
            console.error("Geocoding API failed", e);
        }
    };

    const handleSelectStart = (place: any) => {
        setStart(place.address);
        setStartCoords({ lat: place.location.y, lon: place.location.x });
        setShowStartSugg(false);
    };

    const handleSelectDest = (place: any) => {
        setDestination(place.address);
        setDestCoords({ lat: place.location.y, lon: place.location.x });
        setShowDestSugg(false);
    };

    const handlePlanTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setWeatherInfo(null);
        setWeatherPenalty(0);

        let currentDestLat = destCoords?.lat;
        let currentDestLon = destCoords?.lon;

        let currentStartLat = startCoords?.lat;
        let currentStartLon = startCoords?.lon;

        try {
            if (!currentStartLat || !currentStartLon) {
                try {
                    const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(start)}&maxLocations=1`);
                    const data = await res.json();
                    if (data.candidates?.[0]) {
                        currentStartLat = data.candidates[0].location.y;
                        currentStartLon = data.candidates[0].location.x;
                        setStartCoords({ lat: currentStartLat as number, lon: currentStartLon as number });
                    }
                } catch (e) { console.error(e); }
            }

            if (!currentDestLat || !currentDestLon) {
                try {
                    const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(destination)}&maxLocations=1`);
                    const data = await res.json();
                    if (data.candidates?.[0]) {
                        currentDestLat = data.candidates[0].location.y;
                        currentDestLon = data.candidates[0].location.x;
                        setDestCoords({ lat: currentDestLat as number, lon: currentDestLon as number });
                    }
                } catch (e) { console.error(e); }
            }
            
            if (!currentStartLat || !currentDestLat) {
                setLoading(false);
                alert("Could not locate one of the destinations accurately. Please try a more specific address or select from the dropdown suggestions.");
                return;
            }

            // Fetch Weather API
            let wInfo = null;
            let wPenalty = 0;
            if (currentDestLat && currentDestLon) {
                const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${currentDestLat}&longitude=${currentDestLon}&current_weather=true`);
                const wData = await wRes.json();
                if (wData?.current_weather) {
                    wInfo = wData.current_weather;
                    setWeatherInfo(wInfo);
                    
                    // Weather Analytics directly impacting the prediction output
                    if (wInfo.temperature < 10) wPenalty += 0.15; // 15% range drop in cold
                    if (wInfo.temperature > 35) wPenalty += 0.10; // 10% range drop in extreme heat
                    if (wInfo.weathercode >= 50) wPenalty += 0.05; // 5% range drop in precipitation/rain
                    
                    setWeatherPenalty(wPenalty);
                }
            }

            // Simulate route generation processing delay alongside Server Action calculation
            setTimeout(async () => {
                const baseRange = evData.rangeAtFull || 300;
                const vehicleRange = baseRange * (1 - wPenalty); // Apply weather API penalty to accurate output
                const currentChargePct = typeof batteryPct === "number" ? batteryPct : 100;

                // Backend accurate mathematical processing on coordinates
                const serverStats = await calculateTripData(
                    currentStartLat as number, 
                    currentStartLon as number, 
                    currentDestLat as number, 
                    currentDestLon as number
                );

                const distance = serverStats.drivingDistance; 
                const timeHrs = Math.floor(serverStats.durationMinutes / 60);
                const timeMins = serverStats.durationMinutes % 60;
                const timeStr = `${timeHrs}h ${timeMins}m`;

                const batteryUsed = (distance / vehicleRange) * evData.batteryCapacity;

                const stops: Stop[] = [];
                let remainingDist = distance;
                let currentRange = (currentChargePct / 100) * vehicleRange;
                let stopCount = 0;
                
                let maxStretch = healthData?.preferredRestInterval || 120;
                const hCond = healthData?.healthCondition;
                if (hCond === "back_pain" || hCond === "pregnancy" || hCond === "bladder") {
                    maxStretch = maxStretch * 0.9;
                }

                while (remainingDist > Math.min(currentRange - 20, maxStretch) && remainingDist > 0) {
                    stopCount++;
                    let distanceToNextStop = Math.min(currentRange - 20, maxStretch);
                    remainingDist -= distanceToNextStop;
                    if (remainingDist <= 0) break;
                    
                    let isRestStop = distanceToNextStop === maxStretch && distanceToNextStop < (currentRange - 20);
                    let chargeTo = isRestStop ? "50%" : "80%";
                    let chargeTime = isRestStop ? "15 mins (Rest & top-up)" : "25 mins (Fast Charge)";
                    
                    stops.push({
                        name: isRestStop ? `Rest Stop & Charge Node ${stopCount}` : `FastCharge Node ${stopCount}`,
                        location: `Near route milestone ${Math.floor(distance - remainingDist)}mi`,
                        arriveWith: isRestStop ? `${Math.floor((currentRange - distanceToNextStop)/vehicleRange * 100)}%` : "15%",
                        chargeTime: chargeTime,
                        chargeTo: chargeTo
                    });
                    currentRange = isRestStop ? vehicleRange * 0.5 : vehicleRange * 0.8;
                }

                const res = { distance, timeStr, batteryUsed, stops, startCoords: { lat: currentStartLat as number, lon: currentStartLon as number }, destCoords: { lat: currentDestLat as number, lon: currentDestLon as number } };
                setRouteResult(res);
                sessionStorage.setItem('currentRoute', JSON.stringify(res));
                setLoading(false);

                await saveTripData(start, destination, distance, timeStr, batteryUsed, stops.length);
            }, 1000);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col xl:flex-row gap-8">
            <div className="w-full xl:w-1/3 shrink-0">
                <div className="glass-panel p-6 rounded-2xl shadow-xl relative overflow-visible">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                    <form onSubmit={handlePlanTrip} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider">Route Details</h3>
                            <div className="space-y-3 relative z-50">
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Starting location"
                                        value={start}
                                        onFocus={() => { if(startSuggestions.length) setShowStartSugg(true) }}
                                        onBlur={() => setTimeout(() => setShowStartSugg(false), 200)}
                                        onChange={(e) => {
                                            setStart(e.target.value);
                                            handleSearch(e.target.value, setStartSuggestions, setShowStartSugg);
                                        }}
                                        className="w-full bg-background/50 border border-border rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    />
                                    <AnimatePresence>
                                        {showStartSugg && startSuggestions.length > 0 && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                                                {startSuggestions.map((s, i) => (
                                                    <div key={i} onClick={() => handleSelectStart(s)} className="px-4 py-3 hover:bg-secondary cursor-pointer border-b border-border last:border-0 truncate">
                                                        <p className="font-bold text-sm truncate">{s.address.split(',')[0]}</p>
                                                        <p className="text-xs text-foreground/50 truncate">{s.address.split(',').slice(1).join(',').trim()}</p>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="relative z-40">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Destination"
                                        value={destination}
                                        onFocus={() => { if(destSuggestions.length) setShowDestSugg(true) }}
                                        onBlur={() => setTimeout(() => setShowDestSugg(false), 200)}
                                        onChange={(e) => {
                                            setDestination(e.target.value);
                                            handleSearch(e.target.value, setDestSuggestions, setShowDestSugg);
                                        }}
                                        className="w-full bg-background/50 border border-border rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                                    />
                                    <AnimatePresence>
                                        {showDestSugg && destSuggestions.length > 0 && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                                                {destSuggestions.map((s, i) => (
                                                    <div key={i} onClick={() => handleSelectDest(s)} className="px-4 py-3 hover:bg-secondary cursor-pointer border-b border-border last:border-0 truncate">
                                                        <p className="font-bold text-sm truncate">{s.address.split(',')[0]}</p>
                                                        <p className="text-xs text-foreground/50 truncate">{s.address.split(',').slice(1).join(',').trim()}</p>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        <hr className="border-border" />

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider">Active Vehicle</h3>
                            <div className="p-4 bg-secondary/50 rounded-xl border border-border flex items-start gap-4">
                                {evData.carPic ? (
                                    <img src={evData.carPic} alt="Car" className="w-14 h-14 rounded-lg object-cover mt-1 shrink-0 border border-border" />
                                ) : (
                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg mt-1 shrink-0">
                                        <Car className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="font-bold">{evData.make} {evData.model}</p>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex justify-between text-sm items-center">
                                            <span className="text-foreground/60 font-semibold flex items-center gap-2">
                                              Current Charge (%)
                                            </span>
                                            <input 
                                                type="number"
                                                required
                                                min="1"
                                                max="100"
                                                value={batteryPct}
                                                onChange={(e) => setBatteryPct(e.target.value === "" ? "" : parseInt(e.target.value))}
                                                className="w-20 bg-background border border-border rounded-lg text-center font-bold text-blue-500 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g. 80"
                                            />
                                        </div>
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="100" 
                                            value={batteryPct || 50} 
                                            onChange={(e) => setBatteryPct(parseInt(e.target.value))}
                                            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                        <p className="text-xs text-foreground/40 text-right font-medium">
                                            Est: {typeof batteryPct === "number" ? ((batteryPct / 100) * evData.batteryCapacity).toFixed(1) : "0.0"} kWh
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-md font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50 group"
                        >
                            {loading ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing Route...</>
                            ) : (
                                <><Navigation className="h-5 w-5 group-hover:rotate-12 transition-transform" /> Generate Eco Route</>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Map & Results */}
            <div className="w-full xl:w-2/3">
                {loading ? (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="glass-panel border-dashed p-12 rounded-3xl flex flex-col items-center justify-center min-h-[500px]"
                    >
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                            <Zap className="h-12 w-12 text-blue-500 animate-bounce relative z-10" />
                        </div>
                        <p className="text-lg font-semibold animate-pulse text-foreground/80">Connecting to Google APIs & Weather...</p>
                    </motion.div>
                ) : routeResult ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Interactive UI Mock Map */}
                        <div className="h-[350px] glass-panel rounded-3xl relative overflow-hidden group">
                            {weatherInfo && (
                                <motion.div initial={{ y: -20, opacity: 0}} animate={{ y: 0, opacity: 1 }} className="absolute top-6 left-6 glass-panel! bg-background/80 backdrop-blur-xl border border-border p-4 rounded-xl flex items-center gap-4 shadow-xl z-20">
                                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                        {weatherInfo.weathercode >= 50 ? <CloudRain className="w-6 h-6" /> : <Thermometer className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider mb-0.5">Dest. Weather</p>
                                        <p className="font-bold">{weatherInfo.temperature}°C <span className="text-sm font-medium text-foreground/60">({weatherInfo.windspeed} km/h wind)</span></p>
                                        {weatherPenalty > 0 && (
                                            <p className="text-xs text-rose-500 font-semibold mt-1">
                                                -{(weatherPenalty * 100).toFixed(0)}% Range Penalty
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                            <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }}></div>
                            <div className="absolute top-1/2 left-1/4 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.8)] z-10">
                                <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                            <div className="absolute top-1/4 right-1/4 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.8)] z-10">
                                <MapPin className="w-3 h-3 text-white" />
                            </div>
                            
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                                <path d="M 25% 50% Q 35% 20% 45% 40% T 65% 30% T 75% 25%" stroke="rgba(59,130,246,0.6)" strokeWidth="4" fill="none" strokeDasharray="10 10" className="animate-[dash_20s_linear_infinite]" />
                            </svg>

                            <div className="absolute bottom-6 left-6 right-6 glass-panel! bg-background/80 backdrop-blur-xl border border-border p-5 rounded-2xl flex items-center justify-between shadow-2xl z-20">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <p className="text-xs text-foreground/50 font-semibold mb-1">Total Distance</p>
                                        <p className="font-bold text-xl">{routeResult.distance} mi</p>
                                    </div>
                                    <div className="w-px h-10 bg-border hidden md:block" />
                                    <div className="hidden md:block">
                                        <p className="text-xs text-foreground/50 font-semibold mb-1">Duration</p>
                                        <p className="font-bold text-xl">{routeResult.timeStr}</p>
                                    </div>
                                    <div className="w-px h-10 bg-border hidden lg:block" />
                                    <div className="hidden lg:block">
                                        <p className="text-xs text-foreground/50 font-semibold mb-1">Stops</p>
                                        <p className="font-bold text-xl">{routeResult.stops.length}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => window.location.href = '/live-map'} className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0">
                                    <Navigation className="h-5 w-5" /> Start Trip
                                </button>
                            </div>
                        </div>

                        {/* Stops Info */}
                        {routeResult.stops.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="font-bold text-xl flex items-center gap-2"><Zap className="text-yellow-500" /> Required Charging Stops</h3>
                                {routeResult.stops.map((stop, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                        key={i} className="glass-panel p-5 rounded-2xl flex items-center justify-between hover:bg-secondary/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                                                <Battery className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold">{stop.name}</h4>
                                                <p className="text-sm text-foreground/60">{stop.location}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-500">{stop.chargeTime}</p>
                                            <p className="text-xs text-foreground/50">Charge to {stop.chargeTo}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                                    <Activity className="h-8 w-8" />
                                </div>
                                <h3 className="font-bold text-xl mb-2">Direct Journey Possible</h3>
                                <p className="text-foreground/60 max-w-md">Your {evData.make} {evData.model} has enough charge to comfortably reach the destination without stopping.</p>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <div className="glass-panel border-dashed p-12 rounded-3xl flex flex-col items-center justify-center min-h-[500px] text-center">
                        <Map className="h-16 w-16 text-foreground/20 mb-6" />
                        <h3 className="text-2xl font-bold mb-3">Ready to Plan</h3>
                        <p className="text-foreground/60 max-w-md">Enter your destination and we will craft the perfect route tailored to your vehicle's current state and range.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
