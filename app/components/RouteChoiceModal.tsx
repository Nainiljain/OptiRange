'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Clock, DollarSign, X, Navigation, Zap, Shield } from 'lucide-react'

interface RouteChoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (preference: 'toll' | 'free') => void
  estimatedDistanceFree?: number
  estimatedDistanceToll?: number
}

export default function RouteChoiceModal({
  isOpen, onClose, onSelect,
}: RouteChoiceModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg px-4"
          >
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-border">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />

              {/* Header */}
              <div className="p-6 pb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl">
                    <Navigation className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Choose Your Route</h2>
                    <p className="text-sm text-foreground/50 mt-0.5">
                      Select the highway you prefer to drive
                    </p>
                  </div>
                </div>
                <button onClick={onClose}
                  className="p-1.5 text-foreground/30 hover:text-foreground/60 transition-colors rounded-lg hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Route options */}
              <div className="px-6 pb-6 space-y-3">

                {/* Free Route — Hwy 401 */}
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => onSelect('free')}
                  className="w-full text-left p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-500/15 rounded-xl shrink-0 mt-0.5">
                        <Shield className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-base">Highway 401</p>
                          <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">
                            FREE
                          </span>
                        </div>
                        <p className="text-sm text-foreground/60 leading-relaxed">
                          Canada's busiest highway — no tolls. Longer route but saves money.
                          ONroute service centres every ~60 km with washrooms, food &amp; EV charging.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs font-semibold text-foreground/50">
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> No toll cost
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-foreground/40" /> Slightly longer
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-blue-400" /> ONroute EV chargers
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-2xl font-black text-emerald-400 group-hover:scale-110 transition-transform">
                      →
                    </div>
                  </div>
                </motion.button>

                {/* Toll Route — ETR 407 */}
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => onSelect('toll')}
                  className="w-full text-left p-5 rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-blue-500/15 rounded-xl shrink-0 mt-0.5">
                        <Zap className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-base">ETR 407</p>
                          <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-full font-bold">
                            TOLL
                          </span>
                          <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-semibold">
                            FASTER
                          </span>
                        </div>
                        <p className="text-sm text-foreground/60 leading-relaxed">
                          Electronic toll road — faster, less traffic. Billed via transponder or
                          plate. Ideal when time matters more than cost.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs font-semibold text-foreground/50">
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-yellow-400" /> Toll applies
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-400" /> Faster journey
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-blue-400" /> Highway charging stops
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-2xl font-black text-blue-400 group-hover:scale-110 transition-transform">
                      →
                    </div>
                  </div>
                </motion.button>

                <p className="text-xs text-center text-foreground/30 pt-1">
                  Charging stations will be matched to your chosen route
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
