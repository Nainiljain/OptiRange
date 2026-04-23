'use client'

import { useActionState, useState, useCallback } from 'react'
import { registerAction } from '@/app/actions'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Mail, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, ImagePlus } from 'lucide-react'
import OnboardingStepper from '@/app/components/OnboardingStepper'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

const initialState = { error: '' }

/** Shake x-keyframes for error banner */
const shakeX = [0, -12, 10, -8, 6, -4, 2, 0]

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState)

  const [step, setStep] = useState(1)
  const onNextStep1 = () => {
    const inputs = ['firstName', 'lastName', 'email', 'password', 'confirm'].map(
      n => document.querySelector(`[name="${n}"]`) as HTMLInputElement
    )
    if (inputs.some(i => i && !i.reportValidity())) return;
    setStep(s => s + 1)
  }

  const onNextStep2 = () => {
    const inputs = ['regCarMake', 'regCarModel', 'regBatteryCapacity', 'regRangeAtFull'].map(
      n => document.querySelector(`[name="${n}"]`) as HTMLInputElement
    )
    if (inputs.some(i => i && !i.reportValidity())) return;
    setStep(s => s + 1)
  }

  const prevStep = () => setStep(s => s - 1)

  // ── Password visibility toggles ─────────────────────────────────────
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Live password-match validation ──────────────────────────────────
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const passwordsMatch = confirm.length === 0 || password === confirm
  const passwordTooShort = password.length > 0 && password.length < 6

  // ── Image size validation ───────────────────────────────────────────
  const [fileError, setFileError] = useState('')
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size > MAX_FILE_SIZE) {
      setFileError(`Image must be under 2 MB (yours: ${(file.size / 1024 / 1024).toFixed(1)} MB)`)
      e.target.value = '' // clear the invalid selection
    } else {
      setFileError('')
    }
  }, [])

  // Combined error from server-side action or local file validation
  const displayError = state?.error || fileError

  // Disable submit if passwords don't match, are too short, or file is invalid
  const isSubmitBlocked = isPending || !passwordsMatch || passwordTooShort || !!fileError

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <OnboardingStepper currentStep={step} />

        <div className="glass-panel p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" />
          
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center p-4 bg-purple-500/10 rounded-2xl mb-4"
            >
              <User className="w-8 h-8 text-purple-500" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Create Account</h1>
            <p className="text-sm text-foreground/60">Join to optimize your EV journey</p>
          </div>

          <form action={formAction} className="space-y-4">
            {/* ── Pending approval banner ── */}
            <AnimatePresence mode="wait">
              {(state as any)?.pending && (state as any)?.message && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center"
                >
                  <div className="text-4xl mb-3">⏳</div>
                  <p className="font-bold text-emerald-400 text-base mb-2">Registration Submitted!</p>
                  <p className="text-foreground/60 text-sm leading-relaxed">{(state as any).message}</p>
                  <a href="/login" className="inline-block mt-4 text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    ← Back to Login
                  </a>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Error banner with shake animation ── */}
            <AnimatePresence mode="wait">
              {displayError && !(state as any)?.pending && (
                <motion.div
                  key={displayError}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, x: shakeX }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 text-red-500 rounded-xl text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{displayError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ======================================================== */}
            {/* STEP 1: ACCOUNT DETAILS                                   */}
            {/* ======================================================== */}
            <div className={step === 1 ? 'space-y-4' : 'hidden'}>
              {/* ── First Name & Last Name ────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type="text"
                    name="firstName"
                    required
                    placeholder="First Name"
                    className="w-full bg-background/50 border border-border rounded-xl px-11 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type="text"
                    name="lastName"
                    required
                    placeholder="Last Name"
                    className="w-full bg-background/50 border border-border rounded-xl px-11 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* ── Email ─────────────────────────────────────────── */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Email Address"
                  className="w-full bg-background/50 border border-border rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* ── Password with show/hide toggle ────────────────── */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* ── Password hint ─────────────────────────────────── */}
              <AnimatePresence>
                {passwordTooShort && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-amber-500 pl-1 -mt-2"
                  >
                    Password must be at least 6 characters
                  </motion.p>
                )}
              </AnimatePresence>

              {/* ── Confirm Password with show/hide toggle ────────── */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm"
                  required
                  placeholder="Confirm Password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`w-full bg-background/50 border rounded-xl px-12 py-3.5 outline-none focus:ring-2 transition-all pr-12 font-medium ${
                    !passwordsMatch
                      ? 'border-red-500 focus:ring-red-500'
                      : confirm.length > 0 && password === confirm
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-border focus:ring-purple-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* ── Password mismatch hint ────────────────────────── */}
              <AnimatePresence>
                {!passwordsMatch && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-500 pl-1 -mt-2"
                  >
                    Passwords do not match
                  </motion.p>
                )}
              </AnimatePresence>

              {/* ── Profile Picture (max 2 MB) ── */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-purple-500" /> Profile Picture
                  <span className="text-foreground/40 font-normal">(Optional · max 2 MB)</span>
                </label>
                <input
                  type="file"
                  name="profilePic"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-500 hover:file:bg-purple-500/20"
                />
              </div>

              <button
                type="button"
                onClick={onNextStep1}
                disabled={!passwordsMatch || passwordTooShort || !!fileError}
                className="w-full flex items-center justify-center gap-2 mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                Next
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* ======================================================== */}
            {/* STEP 2: VEHICLE DETAILS                                   */}
            {/* ======================================================== */}
            <div className={step === 2 ? 'space-y-4' : 'hidden'}>
              <div className="space-y-3 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                <p className="text-sm font-bold text-blue-300 flex items-center gap-2">
                  🚗 Your EV
                  <span className="text-xs text-foreground/40 font-normal">(admin will review before approval)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/60">Make (Brand)</label>
                    <input
                      type="text" name="regCarMake" required placeholder="e.g. Tesla"
                      className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/60">Model</label>
                    <input
                      type="text" name="regCarModel" required placeholder="e.g. Model 3"
                      className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/60">Battery (kWh)</label>
                    <input
                      type="number" name="regBatteryCapacity" required min="10" max="200" placeholder="e.g. 75"
                      className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/60">Range (km)</label>
                    <input
                      type="number" name="regRangeAtFull" required min="50" max="1000" placeholder="e.g. 500"
                      className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-foreground/10 text-foreground font-semibold rounded-xl py-4 transition-all"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onNextStep2}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-4 transition-all group"
                >
                  Next
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* STEP 3: HEALTH PROFILE                                    */}
            {/* ======================================================== */}
            <div className={step === 3 ? 'space-y-4' : 'hidden'}>
              <div className="space-y-3 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
                <p className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  ❤️ Health Profile
                  <span className="text-xs text-foreground/40 font-normal">(helps us personalise your trip rest stops)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/60">Age</label>
                    <input
                      type="number" name="regAge" required min="16" max="99" placeholder="e.g. 28"
                      className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/60">Rest Every (mins)</label>
                    <input
                      type="number" name="regRestInterval" required min="30" max="300" defaultValue="120"
                      className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/60">Health Condition</label>
                  <select name="regHealthCondition" required defaultValue="none"
                    className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium appearance-none">
                    <option value="none">None — Generally healthy</option>
                    <option value="back_pain">Back Pain / Spine Issues</option>
                    <option value="pregnancy">Pregnancy</option>
                    <option value="diabetes">Diabetes</option>
                    <option value="bladder">Frequent Bathroom Needs</option>
                    <option value="chronic_fatigue">Chronic Fatigue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-1/3 flex items-center justify-center gap-2 bg-secondary hover:bg-foreground/10 text-foreground font-semibold rounded-xl py-4 transition-all"
                >
                  Back
                </button>
                <button
                  disabled={isSubmitBlocked}
                  className="w-2/3 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isPending ? 'Creating...' : 'Sign Up'}
                  {!isPending && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> }
                </button>
              </div>
            </div>
          </form>

          <p className="text-center mt-6 text-sm text-foreground/60">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-500 font-semibold hover:underline">
              Sign in Instead
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
