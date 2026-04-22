'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, ShieldCheck, Lock, CheckCircle2, AlertTriangle, Car, RefreshCw, LogOut, Clock } from 'lucide-react'
import Link from 'next/link'
import { getAdminAllCarsServiceAction, markServiceCompletedAction } from '@/app/actions'

// ── PIN lock screen ──────────────────────────────────────────────────────────
function PinScreen({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin]     = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!pin.trim()) return
    onUnlock(pin)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px]" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm z-10">
        <div className="glass-panel p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Service Executive Portal</h1>
            <p className="text-foreground/50 text-sm">Enter your service PIN to access the portal</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Service PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm text-center font-semibold">{error}</p>}
            <button onClick={handleSubmit}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">
              Unlock Portal
            </button>
            <Link href="/dashboard"
              className="flex items-center justify-center gap-2 text-sm text-foreground/40 hover:text-foreground/70 transition-colors mt-2">
              <LogOut className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main portal ──────────────────────────────────────────────────────────────
export default function ServiceExecPage() {
  const [pin, setPin]           = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [cars, setCars]         = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [notes, setNotes]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage]   = useState<{text:string; ok:boolean} | null>(null)
  const [filter, setFilter]     = useState<'all'|'due'|'ok'>('all')

  const handleUnlock = async (enteredPin: string) => {
    setPin(enteredPin)
    setLoading(true)
    try {
      // Test PIN by attempting a read — cars load only if PIN is valid
      const data = await getAdminAllCarsServiceAction()
      setCars(data as any[])
      setUnlocked(true)
    } catch {
      setUnlocked(false)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkDone = async (evId: string) => {
    setSubmitting(true)
    setMessage(null)
    const res = await markServiceCompletedAction(evId, notes, pin)
    if ((res as any).success) {
      setMessage({ text: `✅ Service recorded at ${(res as any).odometerKm?.toLocaleString()} km. Counter reset from this point.`, ok: true })
      setSelected(null)
      setNotes('')
      // Refresh data
      const data = await getAdminAllCarsServiceAction()
      setCars(data as any[])
    } else {
      setMessage({ text: (res as any).error || 'Failed', ok: false })
    }
    setSubmitting(false)
  }

  const filtered = cars.filter(c =>
    filter === 'due' ? c.isDue :
    filter === 'ok'  ? !c.isDue :
    true
  )

  if (!unlocked) return <PinScreen onUnlock={handleUnlock} />

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl"><ShieldCheck className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="font-bold">Service Executive Portal</p>
              <p className="text-xs text-foreground/40">Log completed vehicle services</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={async () => { setLoading(true); const d = await getAdminAllCarsServiceAction(); setCars(d as any[]); setLoading(false); }}
              className="p-2 rounded-xl hover:bg-secondary transition-colors text-foreground/50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-semibold hover:bg-foreground/10 transition-all">
              <LogOut className="w-4 h-4" /> Exit
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Vehicles', value: cars.length,                         color: 'text-blue-400' },
            { label: 'Service Due',    value: cars.filter(c => c.isDue).length,    color: 'text-red-400'  },
            { label: 'Due Soon',       value: cars.filter(c => !c.isDue && c.progressPct >= 80).length, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="glass-panel p-4 rounded-2xl text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-foreground/50 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all','due','ok'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filter === f ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-secondary text-foreground/50 hover:text-foreground'}`}>
              {f === 'all' ? `All (${cars.length})` : f === 'due' ? `Due (${cars.filter(c=>c.isDue).length})` : `Good (${cars.filter(c=>!c.isDue).length})`}
            </button>
          ))}
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`p-4 rounded-xl border text-sm font-semibold ${message.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cars list */}
        <div className="space-y-3">
          {filtered.map(car => (
            <motion.div key={car.evId} layout
              className={`glass-panel rounded-2xl border transition-all ${car.isDue ? 'border-red-500/30 bg-red-500/3' : car.progressPct >= 80 ? 'border-yellow-500/20' : 'border-border'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${car.isDue ? 'bg-red-500/10' : 'bg-secondary'}`}>
                      <Car className={`w-5 h-5 ${car.isDue ? 'text-red-400' : 'text-foreground/60'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{car.make} {car.model}</p>
                        {car.isDue && <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">SERVICE DUE</span>}
                        {!car.isDue && car.progressPct >= 80 && <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-bold">DUE SOON</span>}
                      </div>
                      <p className="text-xs text-foreground/50 mt-0.5">Owner: {car.ownerName} · {car.ownerEmail}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-foreground/40">Total odometer</p>
                    <p className="font-bold text-lg">{car.totalKm.toLocaleString()} km</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-foreground/50 mb-1.5">
                    <span>Since last service: {car.kmSinceLastService?.toLocaleString?.() ?? (car.totalKm - car.lastServiceKm).toLocaleString()} km</span>
                    <span>Next service: {car.nextServiceAt.toLocaleString()} km</span>
                  </div>
                  <div className="h-3 bg-background/60 rounded-full overflow-hidden border border-border">
                    <div className={`h-full rounded-full bg-gradient-to-r transition-all ${car.isDue ? 'from-red-500 to-red-400' : car.progressPct >= 80 ? 'from-yellow-500 to-orange-400' : 'from-blue-500 to-emerald-500'}`}
                      style={{ width: `${car.progressPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-foreground/40">
                      {car.lastServiceDate ? `Last serviced: ${new Date(car.lastServiceDate).toLocaleDateString()}` : 'Never serviced'}
                    </span>
                    <span className={`font-bold ${car.isDue ? 'text-red-400' : 'text-foreground/60'}`}>
                      {car.isDue ? 'Overdue' : `${car.remainingKm.toLocaleString()} km left`}
                    </span>
                  </div>
                </div>

                {/* Mark done button */}
                {selected !== car.evId ? (
                  <button onClick={() => { setSelected(car.evId); setNotes(''); setMessage(null); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all w-full justify-center ${car.isDue ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' : 'bg-secondary text-foreground/50 hover:text-foreground border border-border'}`}>
                    <Wrench className="w-3.5 h-3.5" />
                    {car.isDue ? 'Mark Service Complete ✓' : 'Log Service'}
                  </button>
                ) : (
                  <AnimatePresence>
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 border-t border-border pt-4">
                      <p className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Confirm Service Completion</p>
                      <p className="text-xs text-foreground/50">
                        This will record the service at <strong className="text-foreground">{car.totalKm.toLocaleString()} km</strong> and reset the countdown from this point.
                      </p>
                      <textarea
                        placeholder="Service notes (optional) — e.g. Oil inspection, tire rotation..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleMarkDone(car.evId)} disabled={submitting}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                          {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Confirm Service Done
                        </button>
                        <button onClick={() => setSelected(null)}
                          className="px-4 py-2.5 border border-border rounded-xl text-xs font-bold text-foreground/50 hover:bg-secondary transition-all">
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="glass-panel p-12 rounded-2xl text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="text-foreground/40">No vehicles in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
