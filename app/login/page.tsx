'use client'

import { useActionState, useEffect } from 'react'
import { loginAction } from '@/app/actions'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { BatteryCharging, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'

const initialState = { error: '' }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="glass-panel p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
          
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center justify-center p-4 bg-blue-500/10 rounded-2xl mb-4"
            >
              <BatteryCharging className="w-8 h-8 text-blue-500" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-sm text-foreground/60">Enter your credentials to access your dashboard</p>
          </div>

          <form action={formAction} className="space-y-6">
            {state?.error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
                  (state as any).pending
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'bg-red-500/10 text-red-500'
                }`}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{state.error}</span>
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Email Address"
                  className="w-full bg-background/50 border border-border rounded-xl px-12 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Password"
                  className="w-full bg-background/50 border border-border rounded-xl px-12 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isPending ? 'Signing in...' : 'Sign In'}
              {!isPending && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-foreground/60">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-500 font-semibold hover:underline">
              Register now
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
