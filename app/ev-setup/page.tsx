'use client'

import { useActionState, useState, useEffect, Suspense } from 'react'
import { saveEvData, getEvByIdAction } from '@/app/actions'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Car, Battery, Activity, ArrowRight, AlertCircle, Settings2,
  ChevronDown, Loader2, CheckCircle2, Sparkles,
} from 'lucide-react'

const initialState = { error: '' }

// ─── CarAPI lookup hook ────────────────────────────────────────────────────────

function useEVLookup() {
  const [makes, setMakes]                   = useState<string[]>([])
  const [models, setModels]                 = useState<string[]>([])
  const [specs, setSpecs]                   = useState<any[]>([])
  const [loadingMakes, setLoadingMakes]     = useState(false)
  const [loadingModels, setLoadingModels]   = useState(false)
  const [loadingSpecs, setLoadingSpecs]     = useState(false)

  useEffect(() => {
    setLoadingMakes(true)
    fetch('/api/ev-lookup?action=makes')
      .then(r => r.json())
      .then(d => setMakes((d.data || []).map((m: any) => m.name || m)))
      .catch(() => setMakes([]))
      .finally(() => setLoadingMakes(false))
  }, [])

  const fetchModels = (make: string) => {
    if (!make) return
    setModels([]); setSpecs([]); setLoadingModels(true)
    fetch(`/api/ev-lookup?action=models&make=${encodeURIComponent(make)}`)
      .then(r => r.json())
      .then(d => setModels((d.data || []).map((m: any) => m.name || m)))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false))
  }

  const fetchSpecs = (make: string, model: string, year: string) => {
    if (!make || !model) return
    setSpecs([]); setLoadingSpecs(true)
    fetch(`/api/ev-lookup?action=specs&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`)
      .then(r => r.json())
      .then(d => setSpecs(d.data || []))
      .catch(() => setSpecs([]))
      .finally(() => setLoadingSpecs(false))
  }

  return { makes, models, specs, loadingMakes, loadingModels, loadingSpecs, fetchModels, fetchSpecs }
}

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function EvSetupForm() {
  const [state, formAction, isPending] = useActionState(saveEvData, initialState)
  const searchParams = useSearchParams()
  const editId       = searchParams.get('editId')

  const { makes, models, specs, loadingMakes, loadingModels, loadingSpecs, fetchModels, fetchSpecs } = useEVLookup()

  const [lookupMake,  setLookupMake]  = useState('')
  const [lookupModel, setLookupModel] = useState('')
  const [lookupYear,  setLookupYear]  = useState('2024')
  const [autoFilled,  setAutoFilled]  = useState(false)

  // Form field values
  const [fMake,     setFMake]     = useState('')
  const [fModel,    setFModel]    = useState('')
  const [fNickname, setFNickname] = useState('')
  const [fBattery,  setFBattery]  = useState('')
  const [fRange,    setFRange]    = useState('')
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Pre-fill form when editing an existing car
  useEffect(() => {
    if (!editId) return
    setLoadingEdit(true)
    getEvByIdAction(editId).then(ev => {
      if (ev) {
        setFMake(ev.make)
        setFModel(ev.model)
        setFNickname(ev.nickname)
        setFBattery(String(ev.batteryCapacity))
        setFRange(String(ev.rangeAtFull))
      }
    }).finally(() => setLoadingEdit(false))
  }, [editId])

  const handleLookupMakeChange = (make: string) => {
    setLookupMake(make); setLookupModel(''); setAutoFilled(false)
    if (make) fetchModels(make)
  }

  const handleLookupModelChange = (model: string) => {
    setLookupModel(model); setAutoFilled(false)
    if (lookupMake && model) fetchSpecs(lookupMake, model, lookupYear)
  }

  const applySpec = (spec: any) => {
    setFMake(spec.make || lookupMake)
    setFModel(`${spec.model}${spec.trim ? ' ' + spec.trim : ''}`)
    if (spec.batteryCapacityKwh) setFBattery(String(spec.batteryCapacityKwh))
    const rangeKm = spec.rangeKm || (spec.rangeMiles ? Math.round(spec.rangeMiles * 1.60934) : null)
    if (rangeKm) setFRange(String(rangeKm))
    setAutoFilled(true)
  }

  const years = Array.from({ length: 8 }, (_, i) => String(2024 - i))

  if (loadingEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="w-full max-w-2xl z-10 space-y-6">

        {/* ── CarAPI Auto-Lookup Panel ── */}
        <div className="glass-panel p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-blue-500 to-emerald-500" />
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Auto-fill from CarAPI</h2>
              <p className="text-xs text-foreground/50">Select your EV make, model &amp; year to auto-populate specs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <label className="text-xs font-semibold text-foreground/60 mb-1.5 block">Make</label>
              <div className="relative">
                <select value={lookupMake} onChange={e => handleLookupMakeChange(e.target.value)} disabled={loadingMakes}
                  className="w-full appearance-none bg-background/50 border border-border rounded-xl px-3 py-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all disabled:opacity-50">
                  <option value="">Select make…</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/40">
                  {loadingMakes ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-semibold text-foreground/60 mb-1.5 block">Model</label>
              <div className="relative">
                <select value={lookupModel} onChange={e => handleLookupModelChange(e.target.value)} disabled={!lookupMake || loadingModels}
                  className="w-full appearance-none bg-background/50 border border-border rounded-xl px-3 py-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all disabled:opacity-50">
                  <option value="">Select model…</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/40">
                  {loadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-semibold text-foreground/60 mb-1.5 block">Year</label>
              <div className="relative">
                <select value={lookupYear}
                  onChange={e => { setLookupYear(e.target.value); if (lookupMake && lookupModel) fetchSpecs(lookupMake, lookupModel, e.target.value); }}
                  className="w-full appearance-none bg-background/50 border border-border rounded-xl px-3 py-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {loadingSpecs && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-2 text-sm text-foreground/50">
                <Loader2 className="w-4 h-4 animate-spin" /> Fetching EV specs from CarAPI…
              </motion.div>
            )}
            {!loadingSpecs && specs.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 space-y-2 max-h-44 overflow-y-auto pr-1">
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">
                  {specs.length} trim{specs.length !== 1 ? 's' : ''} found — click to auto-fill
                </p>
                {specs.map((spec, i) => (
                  <button key={i} type="button" onClick={() => applySpec(spec)}
                    className="w-full text-left p-3 rounded-xl border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{spec.year} {spec.make} {spec.model} {spec.trim && <span className="text-foreground/50">{spec.trim}</span>}</p>
                        <p className="text-xs text-foreground/40 mt-0.5">
                          {spec.batteryCapacityKwh ? `${spec.batteryCapacityKwh} kWh · ` : ''}
                          {spec.rangeKm ? `${spec.rangeKm} km range` : spec.rangeMiles ? `${Math.round(spec.rangeMiles * 1.60934)} km range` : 'Range data pending'}
                          {spec.chargerType ? ` · ${spec.chargerType}` : ''}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-purple-500 transition-colors shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
            {!loadingSpecs && lookupMake && lookupModel && specs.length === 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-3 text-sm text-foreground/40 italic">
                No EV specs found — please enter manually below.
              </motion.p>
            )}
          </AnimatePresence>

          {autoFilled && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="mt-3 flex items-center gap-2 text-sm text-emerald-500 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Specs auto-filled from CarAPI
            </motion.div>
          )}
        </div>

        {/* ── Main EV Config Form ── */}
        <div className="glass-panel p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center p-5 bg-emerald-500/10 rounded-2xl mb-4">
              <Settings2 className="w-10 h-10 text-emerald-500" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {editId ? 'Edit Vehicle' : 'Configure Your EV'}
            </h1>
            <p className="text-sm text-foreground/60 max-w-md mx-auto">
              {editId ? 'Update your vehicle specifications below.' : 'Use the auto-fill panel above or enter your vehicle specs manually.'}
            </p>
          </div>

          <form action={formAction} className="space-y-6">
            {/* Pass editId so saveEvData knows to update vs create */}
            {editId && <input type="hidden" name="editId" value={editId} />}

            {state?.error && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold">
                <AlertCircle className="w-5 h-5" /><span>{state.error}</span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-500" /> Make (Brand)
                </label>
                <input type="text" name="make" required placeholder="e.g. Tesla"
                  value={fMake} onChange={e => setFMake(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-500" /> Model
                </label>
                <input type="text" name="model" required placeholder="e.g. Model 3 Long Range"
                  value={fModel} onChange={e => setFModel(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-400" /> Nickname <span className="text-foreground/40 font-normal">(optional)</span>
                </label>
                <input type="text" name="nickname" placeholder="e.g. Daily Driver, Road Trip Car"
                  value={fNickname} onChange={e => setFNickname(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Battery className="w-4 h-4 text-blue-500" /> Battery Capacity
                </label>
                <div className="relative">
                  <input type="number" step="0.1" name="batteryCapacity" required placeholder="e.g. 75"
                    value={fBattery} onChange={e => setFBattery(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 pr-16 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 font-semibold text-sm">kWh</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" /> Range at Full Charge
                </label>
                <div className="relative">
                  <input type="number" name="rangeAtFull" required placeholder="e.g. 500"
                    value={fRange} onChange={e => setFRange(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 pr-16 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 font-semibold text-sm">km</span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-500" /> Vehicle Picture <span className="text-foreground/40 font-normal">(optional)</span>
                </label>
                <input type="file" name="carPic" accept="image/*"
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20" />
              </div>
            </div>

            <button disabled={isPending}
              className="w-full flex items-center justify-center gap-2 mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl py-4 font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-emerald-500/20">
              {isPending ? (editId ? 'Updating…' : 'Saving…') : (editId ? 'Update Vehicle' : 'Save & Continue')}
              {!isPending && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Page wrapper (Suspense required for useSearchParams) ─────────────────────

export default function EvSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <EvSetupForm />
    </Suspense>
  )
}
