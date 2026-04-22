import Link from "next/link"
import { Map, ArrowRight, ChevronRight } from "lucide-react"

interface Trip {
  _id: string
  startLocation: string
  endLocation: string
  distance: number
  estimatedTime: string
  batteryUsed: number
  createdAt: string | Date
}

interface RecentTripsProps {
  trips: Trip[]
}

/**
 * Recent trip activity list with empty-state CTA.
 * Used on the dashboard overview page.
 */
export default function RecentTrips({ trips }: RecentTripsProps) {
  return (
    <section className="relative z-10 mb-8" aria-label="Recent trip activity">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Recent Trip Activity</h2>
        <Link
          href="/trip-planner"
          className="text-sm text-blue-500 hover:text-blue-400 font-medium flex items-center transition-colors"
        >
          All History <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
        </Link>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="divide-y divide-border">
          {trips.length > 0 ? (
            trips.map((trip) => (
              <div
                key={trip._id}
                className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="p-3 bg-background rounded-xl border border-border" aria-hidden="true">
                    <Map className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                      {trip.startLocation}{" "}
                      <ArrowRight className="h-4 w-4 text-foreground/40" aria-hidden="true" />{" "}
                      {trip.endLocation}
                    </p>
                    <p className="text-sm text-foreground/60 mt-0.5">
                      {new Date(trip.createdAt).toLocaleDateString()} • {trip.distance} mi •{" "}
                      {trip.estimatedTime}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                    Completed
                  </span>
                  <span className="text-xs font-medium text-foreground/50">
                    {(trip.batteryUsed || 0).toFixed(1)} kWh used
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Map className="h-12 w-12 text-foreground/20 mb-4" aria-hidden="true" />
              <p className="text-lg font-semibold mb-2">No trips recorded</p>
              <p className="text-foreground/60 text-sm max-w-sm mb-6">
                Start planning your journeys and they will appear here dynamically.
              </p>
              <Link
                href="/trip-planner"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
              >
                Plan First Trip
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
