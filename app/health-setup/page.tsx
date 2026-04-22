'use client'

import { useActionState, useState, useEffect } from 'react'
import { saveHealthData, getHealthDataAction } from '@/app/actions'
import { motion } from 'framer-motion'
import { Activity, Heart, Clock, ArrowRight, AlertCircle, User, Loader2 } from 'lucide-react'

const initialState = { error: '' }

export default function HealthSetupPage() {
  const [state, formAction, isPending] = useActionState(saveHealthData, initialState)

  // Controlled fields so we can pre-fill from existing data
  const [age, setAge]           = useState('')
  const [condition, setCondition] = useState('')
  const [interval, setInterval] = useState('120')
  const [loading, setLoading]   = useState(true)

  // Pre-fill if user already has health data (editing profile)
  useEffect(() => {
    getHealthDataAction().then(data => {
      if (data) {
        setAge(String(data.age))
        setCondition(data.healthCondition)
        setInterval(String(data.preferredRestInterval))
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl z-10"
      >
        <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-rose-500" />

          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center p-5 bg-purple-500/10 rounded-2xl mb-4"
            >
              <Heart className="w-10 h-10 text-purple-500" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Health &amp; Comfort Setup</h1>
            <p className="text-base text-foreground/60 max-w-md mx-auto">
              Tell us about your health profile so we can recommend the perfect rest intervals for your long trips.
            </p>
          </div>

          <form action={formAction} className="space-y-6">
            {state?.error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold"
              >
                <AlertCircle className="w-5 h-5" />
                <span>{state.error}</span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-500" /> Age
                </label>
                <input
                  type="number"
                  name="age"
                  required
                  min="16"
                  max="120"
                  placeholder="e.g. 35"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-pink-500" /> Preferred Rest Interval
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="preferredRestInterval"
                    required
                    min="30"
                    max="300"
                    placeholder="e.g. 120"
                    value={interval}
                    onChange={e => setInterval(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 pr-20 outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 font-semibold text-sm">mins</span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" /> Medical / Health Condition
                </label>
                <select
                  name="healthCondition"
                  required
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium appearance-none"
                >
                  <option value="" disabled>Select condition (if any)</option>
                  <option value="none">None — Generally healthy</option>
                  <option value="back_pain">Back Pain / Spine Issues</option>
                  <option value="pregnancy">Pregnancy</option>
                  <option value="diabetes">Diabetes</option>
                  <option value="bladder">Frequent Bathroom Needs</option>
                  <option value="chronic_fatigue">Chronic Fatigue</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-xs text-foreground/50 mt-1">
                  This helps us plan optimal rest breaks for your wellness on long routes.
                </p>
              </div>
            </div>

            <button
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 mt-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl py-4 font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-purple-500/20"
            >
              {isPending ? 'Saving…' : 'Save Health Profile'}
              {!isPending && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
