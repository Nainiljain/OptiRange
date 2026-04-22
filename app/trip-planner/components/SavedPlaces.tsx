"use client"

import { Home, Briefcase, Star, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SavedLocation {
  id: string
  label: string
  type: string
  address: string
  lat: number
  lon: number
}

interface SavedPlacesProps {
  savedLocs: SavedLocation[]
  showSaveFavForm: "start" | "dest" | null
  favLabel: string
  favType: "home" | "work" | "favourite"
  /** Current start/destination values to pre-fill the save form */
  start: string
  destination: string
  startCoords: { lat: number; lon: number } | null
  destCoords: { lat: number; lon: number } | null

  onSelectDest: (address: string, lat: number, lon: number) => void
  onShowSaveFavForm: (field: "start" | "dest" | null) => void
  onFavLabelChange: (label: string) => void
  onFavTypeChange: (type: "home" | "work" | "favourite") => void
  onSaveFav: (address: string) => void
  onDeleteFav: (id: string) => void
}

/** Icon helper for location types */
function FavIcon({ type }: { type: string }) {
  if (type === "home") return <Home className="w-3.5 h-3.5" aria-hidden="true" />
  if (type === "work") return <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
  return <Star className="w-3.5 h-3.5" aria-hidden="true" />
}

/**
 * Saved places bar (Home/Work shortcuts + favourites) and the save-favourite form.
 */
export default function SavedPlaces({
  savedLocs,
  showSaveFavForm,
  favLabel,
  favType,
  start,
  destination,
  startCoords,
  destCoords,
  onSelectDest,
  onShowSaveFavForm,
  onFavLabelChange,
  onFavTypeChange,
  onSaveFav,
  onDeleteFav,
}: SavedPlacesProps) {
  const homeLoc = savedLocs.find((l) => l.type === "home")
  const workLoc = savedLocs.find((l) => l.type === "work")
  const favLocs = savedLocs.filter((l) => l.type === "favourite")

  return (
    <>
      {/* ── Shortcuts bar ── */}
      <div className="flex flex-wrap gap-2 min-h-[32px] items-center" role="group" aria-label="Quick location shortcuts">
        {/* Home shortcut */}
        {homeLoc ? (
          <button
            type="button"
            onClick={() => onSelectDest(homeLoc.address, homeLoc.lat, homeLoc.lon)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-all border border-blue-500/20"
            aria-label="Set destination to Home"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" /> Home
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onShowSaveFavForm("start")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 text-foreground/30 text-xs font-semibold hover:bg-blue-500/10 hover:text-blue-400 transition-all border border-dashed border-foreground/10 hover:border-blue-500/30"
            aria-label="Add home address"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" /> Add Home
          </button>
        )}

        {/* Work shortcut */}
        {workLoc ? (
          <button
            type="button"
            onClick={() => onSelectDest(workLoc.address, workLoc.lat, workLoc.lon)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-all border border-purple-500/20"
            aria-label="Set destination to Work"
          >
            <Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> Work
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onShowSaveFavForm("start")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 text-foreground/30 text-xs font-semibold hover:bg-purple-500/10 hover:text-purple-400 transition-all border border-dashed border-foreground/10 hover:border-purple-500/30"
            aria-label="Add work address"
          >
            <Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> Add Work
          </button>
        )}

        {/* Custom favourites */}
        {favLocs.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() => onSelectDest(loc.address, loc.lat, loc.lon)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-semibold hover:bg-yellow-500/20 transition-all border border-yellow-500/20"
            aria-label={`Set destination to ${loc.label}`}
          >
            <Star className="w-3.5 h-3.5" aria-hidden="true" /> {loc.label}
          </button>
        ))}
      </div>

      {/* ── Save favourite form ── */}
      <AnimatePresence>
        {showSaveFavForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-3 overflow-hidden"
            role="dialog"
            aria-label="Save location as favourite"
          >
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
              <Star className="w-3.5 h-3.5" aria-hidden="true" />
              Save Location as Favourite
            </p>

            <input
              type="text"
              placeholder="Enter address to save…"
              defaultValue={showSaveFavForm === "start" ? start : destination}
              id="fav-address-input"
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Address to save"
            />

            <div className="flex gap-2" role="group" aria-label="Location type">
              {(["home", "work", "favourite"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onFavTypeChange(t)
                    onFavLabelChange(t === "home" ? "Home" : t === "work" ? "Work" : "")
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    favType === t
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                      : "border-border text-foreground/50 hover:border-yellow-500/30"
                  }`}
                  aria-pressed={favType === t}
                >
                  {t === "home" ? (
                    <Home className="w-3 h-3" aria-hidden="true" />
                  ) : t === "work" ? (
                    <Briefcase className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <Star className="w-3 h-3" aria-hidden="true" />
                  )}{" "}
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Label (e.g. Mom's House)"
              value={favLabel}
              onChange={(e) => onFavLabelChange(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Location label"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const addrInput = document.getElementById("fav-address-input") as HTMLInputElement
                  const addr = addrInput?.value || (showSaveFavForm === "start" ? start : destination)
                  onSaveFav(addr)
                }}
                className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-bold hover:bg-yellow-500/30 transition-all"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => onShowSaveFavForm(null)}
                className="px-4 py-2 border border-border rounded-lg text-xs font-bold text-foreground/50 hover:bg-secondary transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Saved locations list ── */}
      {savedLocs.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Saved Places</p>
          {savedLocs.map((loc) => (
            <div key={loc.id} className="flex items-center gap-2 group">
              <button
                type="button"
                onClick={() => onSelectDest(loc.address, loc.lat, loc.lon)}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-all text-left"
                aria-label={`Set destination to ${loc.label}: ${loc.address}`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    loc.type === "home"
                      ? "bg-blue-500/10 text-blue-400"
                      : loc.type === "work"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  <FavIcon type={loc.type} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{loc.label}</p>
                  <p className="text-xs text-foreground/40 truncate">{loc.address}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onDeleteFav(loc.id)}
                className="p-1.5 opacity-0 group-hover:opacity-100 text-foreground/30 hover:text-red-400 transition-all"
                aria-label={`Delete ${loc.label} from saved places`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
