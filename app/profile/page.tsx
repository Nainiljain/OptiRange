'use client'

import { useActionState, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfileAction, getUserProfileAction } from '@/app/actions'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Lock, Camera, AlertCircle, CheckCircle2,
  ArrowLeft, Save, Loader2, Eye, EyeOff, ImagePlus,
} from 'lucide-react'

const initialState: any = { error: '', success: false, message: '' }
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

/** Shake x-keyframes for error banner */
const shakeX = [0, -12, 10, -8, 6, -4, 2, 0]

export default function ProfilePage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Loading state for initial data fetch ─────────────────────────────
  const [loading, setLoading] = useState(true)

  // ── Controlled form fields ───────────────────────────────────────────
  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [currentPic, setCurrentPic]   = useState<string | null>(null)
  const [previewPic, setPreviewPic]   = useState<string | null>(null)

  // ── File validation ──────────────────────────────────────────────────
  const [fileError, setFileError] = useState('')
  const passwordTooShort = password.length > 0 && password.length < 6
  const passwordsMatch = confirm.length === 0 || password === confirm

  // ── Pre-fill from server ─────────────────────────────────────────────
  useEffect(() => {
    getUserProfileAction().then(data => {
      if (!data) {
        router.push('/login')
        return
      }
      setFirstName(data.firstName)
      setLastName(data.lastName)
      setEmail(data.email)
      setCurrentPic(data.profilePic)
    }).finally(() => setLoading(false))
  }, [router])

  // ── Refresh data after successful save ───────────────────────────────
  useEffect(() => {
    if (state?.success) {
      getUserProfileAction().then(data => {
        if (data) {
          setFirstName(data.firstName)
          setLastName(data.lastName)
          setEmail(data.email)
          setCurrentPic(data.profilePic)
          setPreviewPic(null)
          setPassword('')
          setConfirm('')
        }
      })
    }
  }, [state?.success, state?.message])

  // ── Handle file selection with preview + size validation ─────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size > MAX_FILE_SIZE) {
      setFileError(`Image must be under 2 MB (yours: ${(file.size / 1024 / 1024).toFixed(1)} MB)`)
      e.target.value = ''
      setPreviewPic(null)
    } else if (file) {
      setFileError('')
      const reader = new FileReader()
      reader.onload = () => setPreviewPic(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setFileError('')
      setPreviewPic(null)
    }
  }, [])

  const displayError = state?.error || fileError
  const isSubmitBlocked = isPending || passwordTooShort || !!fileError || !passwordsMatch

  // Avatar to display (preview → current → fallback initial)
  const avatarSrc = previewPic || currentPic

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* ── Ambient background blurs ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl z-10"
      >
        {/* ── Back link ── */}
        <motion.button
          type="button"
          onClick={() => router.push('/dashboard')}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 text-sm font-medium text-foreground/50 hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </motion.button>

        <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* ── Gradient accent bar ── */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500" />

          {/* ── Header ── */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center p-5 bg-blue-500/10 rounded-2xl mb-4"
            >
              <User className="w-10 h-10 text-blue-500" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Profile Settings</h1>
            <p className="text-base text-foreground/60 max-w-md mx-auto">
              Update your personal information, profile picture, and password.
            </p>
          </div>

          <form action={formAction} className="space-y-8">
            {/* ── Error banner ── */}
            <AnimatePresence mode="wait">
              {displayError && (
                <motion.div
                  key={displayError}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, x: shakeX }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{displayError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Success banner ── */}
            <AnimatePresence mode="wait">
              {state?.success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 p-4 bg-emerald-500/10 text-emerald-500 rounded-xl text-sm font-semibold"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{state.message || 'Profile updated successfully'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Profile Picture ── */}
            <div className="flex flex-col items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer group"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="w-28 h-28 rounded-full object-cover border-4 border-border shadow-lg group-hover:border-blue-500/50 transition-colors"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-blue-500/20 flex items-center justify-center border-4 border-border shadow-lg group-hover:border-blue-500/50 transition-colors">
                    <span className="text-4xl font-bold text-blue-500">
                      {firstName.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}

                {/* Camera overlay */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-7 h-7 text-white" />
                </div>

                {/* Badge */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                  <ImagePlus className="w-4 h-4 text-white" />
                </div>
              </motion.div>

              <input
                ref={fileInputRef}
                type="file"
                name="profilePic"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="profile-pic-input"
              />
              <p className="text-xs text-foreground/40">Click avatar to change · Max 2 MB</p>
            </div>

            {/* ── Name & Email ── */}
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="profile-first-name" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" /> First Name
                  </label>
                  <input
                    id="profile-first-name"
                    type="text"
                    name="firstName"
                    required
                    placeholder="First Name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-last-name" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" /> Last Name
                  </label>
                  <input
                    id="profile-last-name"
                    type="text"
                    name="lastName"
                    required
                    placeholder="Last Name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="profile-email" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-500" /> Email Address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* ── Change Password ── */}
            <div className="space-y-2">
              <label htmlFor="profile-password" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <Lock className="w-4 h-4 text-pink-500" /> New Password
                <span className="text-foreground/40 font-normal">(leave blank to keep current)</span>
              </label>
              <div className="relative">
                <input
                  id="profile-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <AnimatePresence>
                {passwordTooShort && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-amber-500 pl-1"
                  >
                    Password must be at least 6 characters
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Confirm Password ── */}
            <div className="space-y-2">
              <label htmlFor="profile-confirm" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <Lock className="w-4 h-4 text-pink-500" /> Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="profile-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={`w-full bg-background/50 border rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 transition-all font-medium ${
                    !passwordsMatch
                      ? 'border-red-500 focus:ring-red-500'
                      : confirm.length > 0 && password === confirm
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-border focus:ring-pink-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <AnimatePresence>
                {!passwordsMatch && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-500 pl-1"
                  >
                    Passwords do not match
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Save Button ── */}
            <button
              disabled={isSubmitBlocked}
              className="w-full flex items-center justify-center gap-2 mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl py-4 font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-blue-500/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
