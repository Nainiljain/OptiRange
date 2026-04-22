"use client"

import { useRef } from "react"
import { MapPin, Clock, Star, CalendarClock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface RecentSearch {
  address: string
  lat: number
  lon: number
}

interface RouteFormInputsProps {
  start: string
  destination: string
  startSugg: any[]
  destSugg: any[]
  showStartSugg: boolean
  showDestSugg: boolean
  recentSearches: RecentSearch[]
  departureDate: string
  departureTime: string

  onStartChange: (value: string) => void
  onDestinationChange: (value: string) => void
  onSelectStart: (address: string, lat: number, lon: number) => void
  onSelectDest: (address: string, lat: number, lon: number) => void
  onShowStartSugg: (show: boolean) => void
  onShowDestSugg: (show: boolean) => void
  onGeocode: (query: string, setSugg: (s: any[]) => void, setShow: (s: boolean) => void) => void
  onDepartureDateChange: (value: string) => void
  onDepartureTimeChange: (value: string) => void
  onShowSaveFavForm: (field: "start" | "dest" | null) => void
  setStartSugg: (s: any[]) => void
  setDestSugg: (s: any[]) => void
}

/**
 * Route input fields (start + destination with autocomplete) and departure time.
 * Purely presentational — all state is managed by the parent.
 */
export default function RouteFormInputs({
  start,
  destination,
  startSugg,
  destSugg,
  showStartSugg,
  showDestSugg,
  recentSearches,
  departureDate,
  departureTime,
  onStartChange,
  onDestinationChange,
  onSelectStart,
  onSelectDest,
  onShowStartSugg,
  onShowDestSugg,
  onGeocode,
  onDepartureDateChange,
  onDepartureTimeChange,
  onShowSaveFavForm,
  setStartSugg,
  setDestSugg,
}: RouteFormInputsProps) {
  const startInputRef = useRef<HTMLInputElement>(null)
  const destInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {/* ── Route inputs ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider">
          Route Details
        </h3>

        {/* Start input */}
        <div className="relative z-50">
          <label htmlFor="start-location" className="sr-only">
            Starting location
          </label>
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" aria-hidden="true" />
          <input
            id="start-location"
            type="text"
            required
            placeholder="Starting location"
            value={start}
            ref={startInputRef}
            onFocus={() => {
              if (startSugg.length || recentSearches.length) onShowStartSugg(true)
            }}
            onBlur={() => setTimeout(() => onShowStartSugg(false), 200)}
            onChange={(e) => {
              onStartChange(e.target.value)
              onGeocode(e.target.value, setStartSugg, onShowStartSugg)
            }}
            className="w-full bg-background/50 border border-border rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            aria-autocomplete="list"
            aria-controls="start-suggestions"
            aria-expanded={showStartSugg}
          />
          {start && (
            <button
              type="button"
              onClick={() => onShowSaveFavForm("start")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-foreground/30 hover:text-yellow-400 transition-colors"
              aria-label="Save starting location as favourite"
            >
              <Star className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <AnimatePresence>
            {showStartSugg && (startSugg.length > 0 || recentSearches.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                id="start-suggestions"
                role="listbox"
                aria-label="Start location suggestions"
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto"
              >
                {recentSearches.length > 0 && startSugg.length === 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-xs font-bold text-foreground/40 uppercase tracking-wider">
                      Recent
                    </p>
                    {recentSearches.map((r, i) => (
                      <div
                        key={i}
                        role="option"
                        aria-selected={false}
                        onClick={() => onSelectStart(r.address, r.lat, r.lon)}
                        className="px-4 py-2.5 hover:bg-secondary cursor-pointer flex items-center gap-3 border-b border-border last:border-0"
                      >
                        <Clock className="w-4 h-4 text-foreground/30 shrink-0" aria-hidden="true" />
                        <p className="text-sm font-medium truncate">{r.address}</p>
                      </div>
                    ))}
                  </>
                )}
                {startSugg.map((s, i) => (
                  <div
                    key={i}
                    role="option"
                    aria-selected={false}
                    onClick={() => onSelectStart(s.address, s.location.y, s.location.x)}
                    className="px-4 py-3 hover:bg-secondary cursor-pointer border-b border-border last:border-0"
                  >
                    <p className="font-bold text-sm truncate">{s.address.split(",")[0]}</p>
                    <p className="text-xs text-foreground/50 truncate">
                      {s.address.split(",").slice(1).join(",").trim()}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Destination input */}
        <div className="relative z-40">
          <label htmlFor="destination-location" className="sr-only">
            Destination
          </label>
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" aria-hidden="true" />
          <input
            id="destination-location"
            type="text"
            required
            placeholder="Destination"
            value={destination}
            ref={destInputRef}
            onFocus={() => {
              if (destSugg.length || recentSearches.length) onShowDestSugg(true)
            }}
            onBlur={() => setTimeout(() => onShowDestSugg(false), 200)}
            onChange={(e) => {
              onDestinationChange(e.target.value)
              onGeocode(e.target.value, setDestSugg, onShowDestSugg)
            }}
            className="w-full bg-background/50 border border-border rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
            aria-autocomplete="list"
            aria-controls="dest-suggestions"
            aria-expanded={showDestSugg}
          />
          {destination && (
            <button
              type="button"
              onClick={() => onShowSaveFavForm("dest")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-foreground/30 hover:text-yellow-400 transition-colors"
              aria-label="Save destination as favourite"
            >
              <Star className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <AnimatePresence>
            {showDestSugg && (destSugg.length > 0 || recentSearches.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                id="dest-suggestions"
                role="listbox"
                aria-label="Destination suggestions"
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto"
              >
                {recentSearches.length > 0 && destSugg.length === 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-xs font-bold text-foreground/40 uppercase tracking-wider">
                      Recent
                    </p>
                    {recentSearches.map((r, i) => (
                      <div
                        key={i}
                        role="option"
                        aria-selected={false}
                        onClick={() => onSelectDest(r.address, r.lat, r.lon)}
                        className="px-4 py-2.5 hover:bg-secondary cursor-pointer flex items-center gap-3 border-b border-border last:border-0"
                      >
                        <Clock className="w-4 h-4 text-foreground/30 shrink-0" aria-hidden="true" />
                        <p className="text-sm font-medium truncate">{r.address}</p>
                      </div>
                    ))}
                  </>
                )}
                {destSugg.map((s, i) => (
                  <div
                    key={i}
                    role="option"
                    aria-selected={false}
                    onClick={() => onSelectDest(s.address, s.location.y, s.location.x)}
                    className="px-4 py-3 hover:bg-secondary cursor-pointer border-b border-border last:border-0"
                  >
                    <p className="font-bold text-sm truncate">{s.address.split(",")[0]}</p>
                    <p className="text-xs text-foreground/50 truncate">
                      {s.address.split(",").slice(1).join(",").trim()}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <hr className="border-border" />

      {/* ── Departure time ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-2">
          <CalendarClock className="w-4 h-4" aria-hidden="true" /> Departure Time
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="departure-date" className="text-xs text-foreground/50 font-semibold">
              Date
            </label>
            <input
              id="departure-date"
              type="date"
              value={departureDate}
              onChange={(e) => onDepartureDateChange(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="departure-time" className="text-xs text-foreground/50 font-semibold">
              Time
            </label>
            <input
              id="departure-time"
              type="time"
              value={departureTime}
              onChange={(e) => onDepartureTimeChange(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>
      </div>
    </>
  )
}
