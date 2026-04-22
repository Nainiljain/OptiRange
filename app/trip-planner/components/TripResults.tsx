"use client"

import { motion } from "framer-motion"
import {
  MapPin, Navigation, Battery, Activity, Zap, Map,
  CloudRain, Thermometer, Cloud, Brain, ShieldCheck, CheckCircle2,
  Info, Clock, ArrowRight,
} from "lucide-react"
import type { RouteResult } from "@/lib/tripUtils"

interface TripResultsProps {
  routeResult: RouteResult
  weatherInfo: any
  weatherPenalty: number
  selectedCar: any
  departureTime: string
  departureDate: string
  mapEmbedUrl: string | null
}

/**
 * Full results panel: ML advisory, timing banner, map, stats, charging stops.
 */
export default function TripResults({
  routeResult,
  weatherInfo,
  weatherPenalty,
  selectedCar,
  departureTime,
  departureDate,
  mapEmbedUrl,
}: TripResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ── ML Health Advisory ── */}
      {routeResult.mlHealthAdvice && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            routeResult.mlHealthAdvice?.includes("🚨")
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : routeResult.mlHealthAdvice?.includes("⚠️")
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}
          role="alert"
          aria-label="ML health advisory"
        >
          <Brain className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-70">
              ML Health Advisory
            </p>
            <p className="font-semibold text-sm">{routeResult.mlHealthAdvice}</p>
          </div>
        </motion.div>
      )}

      {/* ── Departure → Arrival timing banner ── */}
      {routeResult.arrivalTime && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-4 rounded-2xl border border-blue-500/20 flex items-center justify-between"
          aria-label={`Depart at ${departureTime}, arrive at ${routeResult.arrivalTime}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl" aria-hidden="true">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-foreground/50 font-semibold uppercase tracking-wider mb-0.5">
                Departure
              </p>
              <p className="font-bold">
                {departureTime}{" "}
                <span className="text-foreground/50 text-sm font-normal">
                  on{" "}
                  {new Date(departureDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-foreground/20" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-foreground/50 font-semibold uppercase tracking-wider mb-0.5 text-right">
                Estimated Arrival
              </p>
              <p className="font-bold text-emerald-400">
                {routeResult.arrivalTime}{" "}
                <span className="text-foreground/50 text-sm font-normal">
                  +{routeResult.stops.length * 25} min charging
                </span>
              </p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-xl" aria-hidden="true">
              <Navigation className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Map ── */}
      <div
        className="h-[380px] glass-panel rounded-3xl relative overflow-hidden"
        role="region"
        aria-label="Route map"
      >
        {/* Weather overlay */}
        {weatherInfo && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-4 left-4 bg-background/90 backdrop-blur-xl border border-border p-3 rounded-xl flex items-center gap-3 shadow-xl z-20"
            aria-label={`Destination weather: ${weatherInfo.temperature}°C, wind ${weatherInfo.windspeed} km/h`}
          >
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg" aria-hidden="true">
              {weatherInfo.weathercode >= 50 ? (
                <CloudRain className="w-5 h-5" />
              ) : (
                <Thermometer className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider mb-0.5">
                Dest. Weather
              </p>
              <p className="font-bold text-sm">
                {weatherInfo.temperature}°C{" "}
                <span className="text-foreground/60 font-medium">· {weatherInfo.windspeed} km/h</span>
              </p>
              {weatherPenalty > 0 && (
                <p className="text-xs text-rose-500 font-semibold">
                  −{(weatherPenalty * 100).toFixed(0)}% range penalty
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Distance source badge */}
        <div className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur-md border border-border px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
          {routeResult.distanceSource === "google_maps" ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" /> Google Maps
            </>
          ) : (
            <>
              <Info className="w-3.5 h-3.5 text-yellow-500" aria-hidden="true" /> Haversine estimate
            </>
          )}
        </div>

        {/* Map embed */}
        {mapEmbedUrl ? (
          <iframe
            src={mapEmbedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            title="Route Map"
            aria-label="Interactive route map"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30" aria-hidden="true">
            <div
              className="absolute inset-0 opacity-10 mix-blend-overlay"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="absolute top-1/2 left-1/4 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.8)] z-10">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <div className="absolute top-1/4 right-1/4 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.8)] z-10">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              <path
                d="M 25% 50% Q 35% 20% 45% 40% T 65% 30% T 75% 25%"
                stroke="rgba(59,130,246,0.6)"
                strokeWidth="4"
                fill="none"
                strokeDasharray="10 10"
              />
            </svg>
          </div>
        )}

        {/* Bottom stats bar */}
        <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-xl border border-border p-4 rounded-2xl flex items-center justify-between shadow-2xl z-20">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-xs text-foreground/50 font-semibold mb-0.5">Distance</p>
              <p className="font-bold text-lg">{routeResult.distance} mi</p>
            </div>
            <div className="w-px h-8 bg-border hidden md:block" aria-hidden="true" />
            <div className="hidden md:block">
              <p className="text-xs text-foreground/50 font-semibold mb-0.5">Drive Time</p>
              <p className="font-bold text-lg">{routeResult.timeStr}</p>
            </div>
            <div className="w-px h-8 bg-border hidden lg:block" aria-hidden="true" />
            <div className="hidden lg:block">
              <p className="text-xs text-foreground/50 font-semibold mb-0.5">ML Range</p>
              <p className="font-bold text-lg text-blue-400">{routeResult.mlEffectiveRange} mi</p>
            </div>
            <div className="w-px h-8 bg-border hidden lg:block" aria-hidden="true" />
            <div className="hidden lg:block">
              <p className="text-xs text-foreground/50 font-semibold mb-0.5">Stops</p>
              <p className="font-bold text-lg">{routeResult.stops.length}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (window.location.href = "/live-map")}
            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0"
            aria-label="Start live trip navigation"
          >
            <Navigation className="h-4 w-4" aria-hidden="true" /> Start Trip
          </button>
        </div>
      </div>

      {/* ── Status badges ── */}
      <div className="flex gap-3 flex-wrap" role="group" aria-label="Route status indicators">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
            routeResult.mlStatus === "Reachable"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-orange-500/10 text-orange-400 border-orange-500/30"
          }`}
        >
          <Brain className="w-4 h-4" aria-hidden="true" /> ML: {routeResult.mlStatus}
        </div>
        {weatherPenalty > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/30">
            <Cloud className="w-4 h-4" aria-hidden="true" /> Weather −{(weatherPenalty * 100).toFixed(0)}%
            range
          </div>
        )}
      </div>

      {/* ── Charging stops ── */}
      {routeResult.stops.length > 0 ? (
        <section className="space-y-4" aria-label="Charging stops">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Zap className="text-yellow-500" aria-hidden="true" /> Required Charging Stops
            </h3>
            <span className="text-xs text-foreground/40 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" /> NRCan verified
            </span>
          </div>
          {routeResult.stops.map((stop, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-5 rounded-2xl hover:bg-secondary/50 transition-colors"
              role="region"
              aria-label={`Stop ${i + 1}: ${stop.name}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl mt-0.5 shrink-0 ${
                      stop.station ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                    }`}
                    aria-hidden="true"
                  >
                    <Battery className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold">{stop.name}</h4>
                      {stop.station && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                          NRCan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/60 mt-0.5">{stop.location}</p>
                    {stop.station && (
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-foreground/40 font-medium">
                        {stop.station.dcFastPorts > 0 && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" aria-hidden="true" />{" "}
                            {stop.station.dcFastPorts} DCFC
                          </span>
                        )}
                        {stop.station.level2Ports > 0 && (
                          <span className="flex items-center gap-1">
                            <Battery className="w-3 h-3 text-blue-400" aria-hidden="true" />{" "}
                            {stop.station.level2Ports} L2
                          </span>
                        )}
                        {stop.station.network && <span>{stop.station.network}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-emerald-500">{stop.chargeTime}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">Charge to {stop.chargeTo}</p>
                  <p className="text-xs text-foreground/40 mt-0.5">Arrive at {stop.arriveWith}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </section>
      ) : (
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center">
          <div
            className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4"
            aria-hidden="true"
          >
            <Activity className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-xl mb-2">Direct Journey Possible</h3>
          <p className="text-foreground/60 max-w-md">
            Your {selectedCar.make} {selectedCar.model} has enough charge to reach the destination.
            ML-verified range: <strong className="text-foreground">{routeResult.mlEffectiveRange} mi</strong>.
          </p>
        </div>
      )}
    </motion.div>
  )
}
