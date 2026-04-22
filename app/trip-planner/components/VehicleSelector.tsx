"use client"

import { Car, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface VehicleSelectorProps {
  allEvData: any[]
  selectedCar: any
  showCarPicker: boolean
  batteryPct: number | ""
  multiCar: boolean
  onTogglePicker: () => void
  onSelectCar: (car: any) => void
  onBatteryChange: (value: number | "") => void
}

/**
 * Vehicle selector dropdown + battery charge slider.
 * Converted from a click-div to a proper button for keyboard accessibility.
 */
export default function VehicleSelector({
  allEvData,
  selectedCar,
  showCarPicker,
  batteryPct,
  multiCar,
  onTogglePicker,
  onSelectCar,
  onBatteryChange,
}: VehicleSelectorProps) {
  const batteryValue = typeof batteryPct === "number" ? batteryPct : 80

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider">
        {multiCar ? "Select Vehicle" : "Active Vehicle"}
      </h3>

      {/* ── Selected car display / picker toggle ── */}
      <button
        type="button"
        onClick={() => multiCar && onTogglePicker()}
        aria-expanded={showCarPicker}
        aria-haspopup="listbox"
        aria-label={`Selected vehicle: ${selectedCar.make} ${selectedCar.model}. ${multiCar ? "Click to change vehicle." : ""}`}
        className={`w-full text-left p-4 bg-secondary/50 rounded-xl border transition-all ${
          multiCar
            ? "border-blue-500/30 cursor-pointer hover:border-blue-500/60"
            : "border-border cursor-default"
        }`}
      >
        <div className="flex items-center gap-3">
          {selectedCar.carPic ? (
            <img
              src={selectedCar.carPic}
              alt={`${selectedCar.make} ${selectedCar.model}`}
              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border"
            />
          ) : (
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg shrink-0" aria-hidden="true">
              <Car className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {selectedCar.nickname && (
              <p className="text-xs font-bold text-blue-400 truncate">{selectedCar.nickname}</p>
            )}
            <p className="font-bold truncate">
              {selectedCar.make} {selectedCar.model}
            </p>
            <p className="text-xs text-foreground/50 mt-0.5">
              {selectedCar.batteryCapacity} kWh · {selectedCar.rangeAtFull} km range
            </p>
          </div>
          {multiCar && (
            <div className="text-foreground/40 shrink-0" aria-hidden="true">
              {showCarPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </button>

      {/* ── Car picker dropdown ── */}
      <AnimatePresence>
        {showCarPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            role="listbox"
            aria-label="Choose a vehicle"
          >
            <p className="px-4 pt-3 pb-2 text-xs font-bold text-foreground/40 uppercase tracking-wider">
              Choose a vehicle
            </p>
            {allEvData.map((car: any) => (
              <div
                key={car._id}
                role="option"
                aria-selected={selectedCar._id === car._id}
                tabIndex={0}
                onClick={() => onSelectCar(car)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectCar(car)
                  }
                }}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-t border-border hover:bg-secondary ${
                  selectedCar._id === car._id ? "bg-blue-500/10" : ""
                }`}
              >
                {car.carPic ? (
                  <img
                    src={car.carPic}
                    alt={`${car.make} ${car.model}`}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border"
                  />
                ) : (
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg shrink-0" aria-hidden="true">
                    <Car className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {car.nickname && (
                    <p className="text-xs text-blue-400 font-semibold truncate">{car.nickname}</p>
                  )}
                  <p className="font-semibold text-sm truncate">
                    {car.make} {car.model}
                  </p>
                  <p className="text-xs text-foreground/40">
                    {car.batteryCapacity} kWh · {car.rangeAtFull} km
                  </p>
                </div>
                {selectedCar._id === car._id && (
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" aria-hidden="true" />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Battery slider ── */}
      <div className="p-4 bg-secondary/30 rounded-xl border border-border space-y-2">
        <div className="flex justify-between text-sm items-center">
          <label htmlFor="battery-pct" className="text-foreground/60 font-semibold">
            Current Charge (%)
          </label>
          <input
            id="battery-pct"
            type="number"
            required
            min={1}
            max={100}
            value={batteryPct}
            onChange={(e) =>
              onBatteryChange(e.target.value === "" ? "" : parseInt(e.target.value))
            }
            className="w-20 bg-background border border-border rounded-lg text-center font-bold text-blue-500 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="80"
            aria-label="Battery charge percentage"
          />
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={batteryValue}
          onChange={(e) => onBatteryChange(parseInt(e.target.value))}
          className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-blue-500"
          aria-label="Battery charge slider"
          aria-valuemin={1}
          aria-valuemax={100}
          aria-valuenow={batteryValue}
        />
        <p className="text-xs text-foreground/40 text-right font-medium">
          Est: {((batteryValue / 100) * selectedCar.batteryCapacity).toFixed(1)} kWh available
        </p>
      </div>
    </div>
  )
}
