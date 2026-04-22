'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, X, ExternalLink, Bell } from 'lucide-react'
import { dismissServiceReminderAction } from '@/app/actions'

interface Reminder {
  id: string
  evId: string
  milestone: number
  emailSent: boolean
}

interface Props {
  reminders: Reminder[]
  cars: Array<{ _id: string; make: string; model: string }>
}

export default function ServiceBanner({ reminders, cars }: Props) {
  const [visible, setVisible] = useState(reminders)

  const dismiss = async (id: string) => {
    await dismissServiceReminderAction(id)
    setVisible(prev => prev.filter(r => r.id !== id))
  }

  if (visible.length === 0) return null

  return (
    <div className="space-y-3 mb-8 relative z-10">
      <AnimatePresence>
        {visible.map(r => {
          const car = cars.find(c => c._id === r.evId)
          const carLabel = car ? `${car.make} ${car.model}` : 'Your EV'
          const bookingKey = car?.make?.toLowerCase() || 'default'
          const BOOKING: Record<string, string> = {
            tesla: 'https://www.tesla.com/support/service',
            nissan: 'https://www.nissan.ca/en/services/schedule-service.html',
            ford: 'https://owner.ford.com/service/schedule-a-service.html',
            bmw: 'https://www.bmw.ca/en/topics/fascination-bmw/service/schedule-service.html',
            hyundai: 'https://www.hyundaicanada.com/en/owners/book-a-service',
            kia: 'https://www.kia.com/ca/en/service-and-maintenance/schedule-service.html',
            default: 'https://www.google.com/search?q=ev+service+center+near+me',
          }
          const bookingUrl = BOOKING[bookingKey] || BOOKING.default

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.96 }}
              className="glass-panel rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-4"
            >
              <div className="p-2.5 bg-yellow-500/15 rounded-xl shrink-0">
                <Wrench className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-sm text-yellow-300">Service Due — {carLabel}</p>
                  {r.emailSent && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <Bell className="w-3 h-3" /> Email sent
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/60">
                  Your vehicle has reached the <strong className="text-yellow-400">{r.milestone.toLocaleString()} km</strong> service milestone.
                  Schedule your appointment to keep performance optimal.
                </p>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Book Service Appointment
                </a>
              </div>
              <button
                onClick={() => dismiss(r.id)}
                className="p-1.5 text-foreground/30 hover:text-foreground/60 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
