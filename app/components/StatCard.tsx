import { type LucideIcon } from "lucide-react"

interface StatCardProps {
  /** Heading text displayed above the value */
  title: string
  /** Numeric or string value to display prominently */
  value: string | number
  /** Unit label displayed beside the value (e.g. "mi", "kWh") */
  unit: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Tailwind color class prefix — e.g. "blue", "emerald", "purple" */
  color: "blue" | "emerald" | "purple"
}

const COLOR_MAP = {
  blue:    { bg: "bg-blue-500/10",    text: "text-blue-500",    glow: "group-hover:bg-blue-500/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", glow: "group-hover:bg-emerald-500/20" },
  purple:  { bg: "bg-purple-500/10",  text: "text-purple-500",  glow: "group-hover:bg-purple-500/20" },
} as const

/**
 * Reusable KPI card with glassmorphism styling.
 * Used on the dashboard overview for Distance, Energy, Trips.
 */
export default function StatCard({ title, value, unit, icon: Icon, color }: StatCardProps) {
  const c = COLOR_MAP[color]

  return (
    <div
      className="glass-panel p-6 rounded-2xl relative overflow-hidden group"
      role="region"
      aria-label={title}
    >
      {/* Subtle glow */}
      <div className={`absolute right-0 top-0 w-24 h-24 ${c.bg} rounded-full blur-2xl ${c.glow} transition-all`} />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-semibold text-foreground/60">{title}</h3>
        <div className={`p-2 ${c.bg} rounded-lg ${c.text}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 relative z-10">
        <p className="text-3xl font-bold">{value}</p>
        <span className="text-sm text-foreground/50">{unit}</span>
      </div>
    </div>
  )
}
