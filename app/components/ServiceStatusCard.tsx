'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, ChevronDown, ChevronUp, ExternalLink, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

interface ServiceStatus {
  evId: string
  make: string
  model: string
  nickname: string
  totalKm: number
  lastServiceKm: number
  lastServiceDate: string | null
  nextServiceAt: number
  remainingKm: number
  kmSinceLastService: number
  progressPct: number
  isDue: boolean
  bookingUrl: string
  serviceHistory: Array<{
    id: string
    odometerKm: number
    milestone: number
    notes: string
    servicedAt: string
  }>
}

export default function ServiceStatusCard({ status }: { status: ServiceStatus }) {
  const [showHistory, setShowHistory] = useState(false)

  const urgencyColor =
    status.isDue        ? 'border-red-500/40 bg-red-500/5' :
    status.progressPct >= 80 ? 'border-yellow-500/40 bg-yellow-500/5' :
                          'border-border bg-card/30'

  const barColor =
    status.isDue        ? 'from-red-500 to-red-400' :
    status.progressPct >= 80 ? 'from-yellow-500 to-orange-400' :
                          'from-blue-500 to-emerald-500'

  const StatusIcon = status.isDue ? AlertTriangle : status.progressPct >= 80 ? Clock : CheckCircle2
  const statusColor = status.isDue ? 'text-red-400' : status.progressPct >= 80 ? 'text-yellow-400' : 'text-emerald-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-2xl p-5 border ${urgencyColor} transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${status.isDue ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
            <Wrench className={`w-5 h-5 ${status.isDue ? 'text-red-400' : 'text-blue-400'}`} />
          </div>
          <div>
            {status.nickname && <p className="text-xs font-bold text-blue-400">{status.nickname}</p>}
            <p className="font-bold text-sm">{status.make} {status.model}</p>
            <p className="text-xs text-foreground/40">{status.totalKm.toLocaleString()} km total</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${statusColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.isDue ? 'Service Due' : status.progressPct >= 80 ? 'Due Soon' : 'Good'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-foreground/50 mb-1.5">
          <span>Since last service: {status.kmSinceLastService.toLocaleString()} km</span>
          <span>Next at: {status.nextServiceAt.toLocaleString()} km</span>
        </div>
        <div className="h-3 bg-background/60 rounded-full overflow-hidden border border-border">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${status.progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
          />
        </div>
        <div className="flex justify-between text-xs mt-1.5">
          <span className="text-foreground/40">
            {status.lastServiceDate
              ? `Last service: ${new Date(status.lastServiceDate).toLocaleDateString()}`
              : 'No service recorded yet'}
          </span>
          <span className={`font-bold ${status.isDue ? 'text-red-400' : 'text-foreground/60'}`}>
            {status.isDue ? '⚠️ Overdue' : `${status.remainingKm.toLocaleString()} km remaining`}
          </span>
        </div>
      </div>

      {/* CTA */}
      {(status.isDue || status.progressPct >= 70) && (
        <a
          href={status.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all mb-3 ${
            status.isDue
              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
              : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Book Service Appointment
        </a>
      )}

      {/* Service history toggle */}
      {status.serviceHistory.length > 0 && (
        <>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/70 transition-colors w-full"
          >
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Service History ({status.serviceHistory.length} record{status.serviceHistory.length !== 1 ? 's' : ''})
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                {status.serviceHistory.map(h => (
                  <div key={h.id} className="flex items-start justify-between bg-background/40 rounded-xl px-3 py-2.5 border border-border">
                    <div>
                      <p className="text-xs font-semibold text-foreground/80">
                        {new Date(h.servicedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-foreground/40">{h.notes || 'Service completed'}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 shrink-0 ml-2">
                      {h.odometerKm.toLocaleString()} km
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}
