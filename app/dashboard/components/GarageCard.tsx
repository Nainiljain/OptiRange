import Link from "next/link"
import { Car, Map, Edit3, Trash2 } from "lucide-react"
import { deleteEvAction } from "@/app/actions"

interface GarageCardProps {
  car: {
    _id: string
    nickname?: string
    make: string
    model: string
    batteryCapacity: number
    rangeAtFull: number
    carPic?: string | null
  }
  /** Whether the user has more than one vehicle (enables delete) */
  canDelete: boolean
}

/**
 * Individual vehicle card in the garage grid.
 * Shows vehicle image, specs, and action buttons.
 */
export default function GarageCard({ car, canDelete }: GarageCardProps) {
  return (
    <article
      className="glass-panel p-5 rounded-2xl border border-border hover:border-blue-500/30 transition-all group relative overflow-hidden"
      aria-label={`${car.make} ${car.model}${car.nickname ? ` — ${car.nickname}` : ""}`}
    >
      {/* Hover accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start gap-4">
        {/* Car image or icon */}
        {car.carPic ? (
          <img
            src={car.carPic}
            alt={`${car.make} ${car.model}`}
            className="w-16 h-16 rounded-xl object-cover border border-border shrink-0"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20"
            aria-hidden="true"
          >
            <Car className="w-7 h-7 text-blue-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {car.nickname && (
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">
              {car.nickname}
            </p>
          )}
          <p className="font-bold text-base truncate">
            {car.make} {car.model}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-background/60 border border-border px-2 py-0.5 rounded-full font-medium">
              {car.batteryCapacity} kWh
            </span>
            <span className="text-xs bg-background/60 border border-border px-2 py-0.5 rounded-full font-medium">
              {car.rangeAtFull} km range
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
        <Link
          href={`/trip-planner?carId=${car._id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-sm font-semibold transition-all"
          aria-label={`Plan trip with ${car.make} ${car.model}`}
        >
          <Map className="w-4 h-4" aria-hidden="true" /> Plan Trip
        </Link>

        <Link
          href={`/ev-setup?editId=${car._id}`}
          className="p-2 rounded-xl bg-secondary hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition-all"
          aria-label={`Edit ${car.make} ${car.model}`}
        >
          <Edit3 className="w-4 h-4" aria-hidden="true" />
        </Link>

        {canDelete && (
          <form action={async () => { "use server"; await deleteEvAction(car._id) }}>
            <button
              type="submit"
              className="p-2 rounded-xl bg-secondary hover:bg-red-500/10 text-foreground/50 hover:text-red-500 transition-all"
              aria-label={`Delete ${car.make} ${car.model}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </article>
  )
}
