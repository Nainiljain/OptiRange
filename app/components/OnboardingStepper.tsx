'use client'

import { motion } from 'framer-motion'
import { User, Car, Heart, Check } from 'lucide-react'

const steps = [
  { label: 'Account', icon: User },
  { label: 'Vehicle', icon: Car },
  { label: 'Health',  icon: Heart },
] as const

interface OnboardingStepperProps {
  currentStep: 1 | 2 | 3
}

export default function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-center justify-between relative">

        {/* ── Connector track (behind circles) ─────────────────── */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-border/40 z-0" />

        {/* ── Animated fill bar ─────────────────────────────────── */}
        <motion.div
          className="absolute top-5 left-[10%] h-[2px] z-[1] rounded-full"
          style={{
            background: 'linear-gradient(90deg, #a855f7, #3b82f6, #10b981)',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 80}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1
          const isActive    = stepNum === currentStep
          const isCompleted = stepNum < currentStep

          return (
            <div key={step.label} className="flex flex-col items-center z-10 relative">

              {/* ── Glow ring for active step ───────────────── */}
              {isActive && (
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full"
                  style={{
                    background:
                      idx === 0
                        ? 'rgba(168,85,247,0.25)'
                        : idx === 1
                          ? 'rgba(59,130,246,0.25)'
                          : 'rgba(16,185,129,0.25)',
                  }}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* ── Step circle ─────────────────────────────── */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 300 }}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  transition-colors duration-300 border-2
                  ${isCompleted
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/20'
                    : isActive
                      ? idx === 0
                        ? 'bg-purple-500/15 border-purple-500 text-purple-500 shadow-lg shadow-purple-500/20'
                        : idx === 1
                          ? 'bg-blue-500/15 border-blue-500 text-blue-500 shadow-lg shadow-blue-500/20'
                          : 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-background/50 border-border/60 text-foreground/30'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </motion.div>

              {/* ── Label ───────────────────────────────────── */}
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className={`
                  mt-2 text-xs font-semibold tracking-wide
                  ${isCompleted
                    ? 'text-emerald-500'
                    : isActive
                      ? 'text-foreground'
                      : 'text-foreground/35'
                  }
                `}
              >
                {step.label}
              </motion.span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
