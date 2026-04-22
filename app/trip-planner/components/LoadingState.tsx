"use client"

import { motion } from "framer-motion"
import { Zap, Brain, Map } from "lucide-react"

interface LoadingStateProps {
  /** Current step label, e.g. "Fetching live weather data…" */
  loadingStep: string
}

/**
 * Animated loading indicator displayed while the trip is being planned.
 * Uses `aria-live` to announce loading steps to screen readers.
 */
export default function LoadingState({ loadingStep }: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-panel border-dashed p-12 rounded-3xl flex flex-col items-center justify-center min-h-[500px]"
      role="status"
      aria-live="polite"
      aria-label="Planning your route"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        <Zap className="h-12 w-12 text-blue-500 animate-bounce relative z-10" aria-hidden="true" />
      </div>

      <p className="text-lg font-semibold animate-pulse text-foreground/80">
        {loadingStep || "Planning your route…"}
      </p>

      <div className="mt-6 flex gap-3 text-sm text-foreground/40">
        <span className="flex items-center gap-1.5">
          <Brain className="w-4 h-4" aria-hidden="true" /> ML Engine
        </span>
        <span aria-hidden="true">·</span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-4 h-4" aria-hidden="true" /> NRCan Stations
        </span>
        <span aria-hidden="true">·</span>
        <span className="flex items-center gap-1.5">
          <Map className="w-4 h-4" aria-hidden="true" /> Google Maps
        </span>
      </div>
    </motion.div>
  )
}
