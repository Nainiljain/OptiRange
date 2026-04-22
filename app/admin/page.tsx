'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, Car, Map, Bell, Activity, Shield, Zap,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Mail, LogOut, ChevronRight, BarChart3, Wrench,
} from 'lucide-react'
import {
  getAdminStatsAction, getAdminUsersAction, getAdminFleetAction,
  getAdminServiceRemindersAction, toggleAdminAction, makeAdminBySecretAction,
  getAdminAllCarsServiceAction, toggleServiceExecAction,
  getPendingUsersAction, approveUserAction, rejectUserAction,
  logoutAction,
} from '@/app/actions'

type Tab = 'overview' | 'users' | 'fleet' | 'tracking' | 'reminders' | 'pending' | 'access'

// ── Stat card ──────────────────────────────────────────────────────────────────
function AdminStat({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
      <div className={`absolute right-0 top-0 w-20 h-20 ${color}/10 rounded-full blur-2xl`} />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <p className="text-sm font-semibold text-foreground/60">{label}</p>
        <div className={`p-2 ${color}/10 rounded-lg`}><Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} /></div>
      </div>
      <p className="text-3xl font-bold relative z-10">{value}</p>
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab]             = useState<Tab>('overview')
  const [stats, setStats]         = useState<any>(null)
  const [users, setUsers]         = useState<any[]>([])
  const [fleet, setFleet]         = useState<any>(null)
  const [reminders, setReminders] = useState<any[]>([])
  const [carsService, setCarsService] = useState<any[]>([])
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [secret, setSecret]       = useState('')
  const [secretMsg, setSecretMsg] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [s, u, f, r, cs, pu] = await Promise.all([
        getAdminStatsAction(),
        getAdminUsersAction(),
        getAdminFleetAction(),
        getAdminServiceRemindersAction(),
        getAdminAllCarsServiceAction(),
        getPendingUsersAction(),
      ])
      setStats(s); setUsers(u); setFleet(f); setReminders(r); setCarsService(cs as any[]); setPendingUsers(pu as any[])
    } catch (e: any) {
      // If forbidden, show Access tab so user can enter the secret
      if (e?.message?.includes('Forbidden') || e?.message?.includes('Unauthorized')) {
        setTab('access')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAdmin(id: string) {
    await toggleAdminAction(id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isAdmin: !u.isAdmin } : u))
  }

  async function handleToggleServiceExec(id: string) {
    const res = await toggleServiceExecAction(id)
    if ((res as any).success) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isServiceExec: !u.isServiceExec } : u))
    }
  }

  async function handleMakeAdmin() {
    const res = await makeAdminBySecretAction(secret)
    if ((res as any).success) { setSecretMsg('✅ You are now an admin! Refreshing…'); setTimeout(() => window.location.reload(), 1500) }
    else setSecretMsg((res as any).error || 'Invalid secret')
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',  label: 'Overview',   icon: BarChart3  },
    { id: 'pending',   label: `Pending${pendingUsers.length > 0 ? ' ('+pendingUsers.length+')' : ''}`, icon: Bell },
    { id: 'users',     label: 'Users',      icon: Users      },
    { id: 'fleet',     label: 'Fleet',      icon: Car        },
    { id: 'tracking',  label: 'Service KM', icon: Activity   },
    { id: 'reminders', label: 'Alerts',     icon: Wrench     },
    { id: 'access',    label: 'Access',     icon: Shield     },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-foreground/60">Loading admin portal…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ── */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl"><Shield className="w-5 h-5 text-red-400" /></div>
            <div>
              <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-1.5 text-foreground/70 hover:text-foreground transition-colors">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <span className="font-bold">OptiRange</span>
                </Link>
                <ChevronRight className="w-4 h-4 text-foreground/30" />
                <span className="font-bold text-red-400">Admin Portal</span>
              </div>
              <p className="text-xs text-foreground/40">Restricted access — authorised personnel only</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadAll} className="p-2 rounded-xl hover:bg-secondary transition-colors text-foreground/50 hover:text-foreground">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-foreground/10 text-sm font-semibold transition-all">
              <LogOut className="w-4 h-4" /> Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Tab nav ── */}
        <div className="flex gap-1 mb-8 bg-secondary/50 p-1 rounded-2xl w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-foreground/50 hover:text-foreground'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Pending Users tab ── */}
        {tab === 'pending' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <h2 className="font-bold text-lg">Pending Approvals</h2>
              <p className="text-foreground/50 text-sm mt-0.5">
                New registrations waiting for your review — you received an email for each one
              </p>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="glass-panel p-16 rounded-2xl text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-foreground/60">No pending registrations</p>
                <p className="text-sm text-foreground/30 mt-1">All users have been reviewed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map(u => (
                  <motion.div key={u.id} layout
                    className="glass-panel rounded-2xl p-5 border border-yellow-500/20 bg-yellow-500/3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {u.profilePic ? (
                          <img src={u.profilePic} alt="" className="w-12 h-12 rounded-full object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                            <span className="font-bold text-blue-400 text-lg">{(u.name || u.email).charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold">{u.name}</p>
                          <p className="text-sm text-foreground/50">{u.email}</p>
                          <p className="text-xs text-foreground/30 mt-0.5">
                            Registered {new Date(u.joinedAt).toLocaleString()}
                          </p>

                          {/* Health info */}
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="bg-background/50 rounded-xl p-2.5 border border-border text-center">
                              <p className="text-xs text-foreground/40 mb-0.5">Age</p>
                              <p className="font-bold text-sm text-foreground/80">
                                {u.regAge > 0 ? u.regAge : '—'}
                              </p>
                            </div>
                            <div className={`rounded-xl p-2.5 border text-center ${
                              ['back_pain','pregnancy','bladder','chronic_fatigue'].includes(u.regHealthCondition)
                                ? 'bg-yellow-500/8 border-yellow-500/20'
                                : 'bg-background/50 border-border'
                            }`}>
                              <p className="text-xs text-foreground/40 mb-0.5">Condition</p>
                              <p className="font-bold text-xs text-foreground/80 truncate">
                                {u.regHealthCondition === 'none' ? '✅ Healthy' :
                                 u.regHealthCondition === 'back_pain' ? '🔴 Back Pain' :
                                 u.regHealthCondition === 'pregnancy' ? '🤰 Pregnancy' :
                                 u.regHealthCondition === 'bladder' ? '🚻 Bladder' :
                                 u.regHealthCondition === 'chronic_fatigue' ? '😴 Fatigue' :
                                 u.regHealthCondition === 'diabetes' ? '💉 Diabetes' :
                                 '⚠️ Other'}
                              </p>
                            </div>
                            <div className="bg-background/50 rounded-xl p-2.5 border border-border text-center">
                              <p className="text-xs text-foreground/40 mb-0.5">Rest Every</p>
                              <p className="font-bold text-sm text-foreground/80">{u.regRestInterval}m</p>
                            </div>
                          </div>

                          {/* Car info */}
                          {u.regCarMake && (
                            <div className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                              <span className="text-lg">🚗</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-blue-300 truncate">
                                  {u.regCarMake} {u.regCarModel}
                                </p>
                                <p className="text-xs text-foreground/40">
                                  {u.regBatteryCapacity > 0 ? `${u.regBatteryCapacity} kWh` : '—'}
                                  {u.regRangeAtFull > 0 ? ` · ${u.regRangeAtFull} km range` : ''}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            const res = await approveUserAction(u.id)
                            if ((res as any).success) {
                              setPendingUsers(prev => prev.filter(x => x.id !== u.id))
                              setUsers(prev => [...prev, { ...u, isApproved: true, isAdmin: false, isServiceExec: false, tripCount: 0, carCount: 0 }])
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-bold hover:bg-emerald-500/20 transition-all">
                          ✅ Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Reject and delete ${u.name}?`)) return
                            const res = await rejectUserAction(u.id)
                            if ((res as any).success) {
                              setPendingUsers(prev => prev.filter(x => x.id !== u.id))
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold hover:bg-red-500/20 transition-all">
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Overview tab ── */}
        {tab === 'overview' && stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <AdminStat label="Total Users"       value={stats.totalUsers}        icon={Users}    color="bg-blue-500"    />
              <AdminStat label="Total Trips"       value={stats.totalTrips}        icon={Map}      color="bg-emerald-500" />
              <AdminStat label="Registered Cars"   value={stats.totalCars}         icon={Car}      color="bg-purple-500"  />
              <AdminStat label="Service Alerts"    value={stats.pendingReminders}  icon={Bell}     color="bg-yellow-500"  />
              <AdminStat label="Distance Logged"   value={`${stats.totalDistance} mi`} icon={Activity} color="bg-pink-500" />
            </div>

            {/* Fleet breakdown */}
            {fleet && (
              <div className="glass-panel p-6 rounded-2xl">
                <h2 className="font-bold text-lg mb-5 flex items-center gap-2"><Car className="w-5 h-5 text-purple-400" /> Fleet Breakdown by Brand</h2>
                <div className="space-y-3">
                  {fleet.byMake.map((item: any) => (
                    <div key={item.make} className="flex items-center gap-4">
                      <span className="w-28 text-sm font-semibold text-foreground/70 truncate">{item.make}</span>
                      <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                          style={{ width: `${(item.count / fleet.total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent reminders preview */}
            <div className="glass-panel p-6 rounded-2xl">
              <h2 className="font-bold text-lg mb-5 flex items-center gap-2"><Wrench className="w-5 h-5 text-yellow-400" /> Recent Service Alerts</h2>
              {reminders.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-semibold text-sm">{r.userName} — {r.make} {r.model}</p>
                    <p className="text-xs text-foreground/50">{r.milestone.toLocaleString()} km milestone</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.emailSent ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Email sent</span>
                      : <span className="text-xs text-foreground/40">Pending</span>}
                    {r.dismissed && <span className="text-xs text-foreground/30 ml-2">Dismissed</span>}
                  </div>
                </div>
              ))}
              {reminders.length === 0 && <p className="text-foreground/40 text-sm">No service reminders yet.</p>}
            </div>
          </motion.div>
        )}

        {/* ── Users tab ── */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="font-bold text-lg">{users.length} Registered Users</h2>
              </div>
              <div className="divide-y divide-border">
                {users.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="font-bold text-blue-500">{(u.name || u.email).charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{u.name || 'No name'}</p>
                          {u.isAdmin && <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">Admin</span>}
                        </div>
                        <p className="text-xs text-foreground/50">{u.email}</p>
                        <p className="text-xs text-foreground/40 mt-0.5">
                          {u.tripCount} trips · {u.carCount} car{u.carCount !== 1 ? 's' : ''} · Joined {new Date(u.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      <button onClick={() => handleToggleAdmin(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${u.isAdmin ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-secondary hover:bg-foreground/10 text-foreground/50'}`}>
                        {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button onClick={() => handleToggleServiceExec(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${u.isServiceExec ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-secondary hover:bg-foreground/10 text-foreground/40'}`}>
                        {u.isServiceExec ? '🔧 Exec Active' : 'Grant Service Exec'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Fleet tab ── */}
        {tab === 'fleet' && fleet && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <h2 className="font-bold text-lg mb-2">Fleet Overview</h2>
              <p className="text-foreground/50 text-sm mb-6">{fleet.total} total vehicles registered across all users</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fleet.byMake.map((item: any) => (
                  <div key={item.make} className="bg-secondary/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold">{item.make}</p>
                      <span className="text-2xl font-black text-blue-400">{item.count}</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                        style={{ width: `${(item.count / fleet.total) * 100}%` }} />
                    </div>
                    <p className="text-xs text-foreground/40 mt-1">{((item.count / fleet.total) * 100).toFixed(1)}% of fleet</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Service Tracking tab ── */}
        {tab === 'tracking' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Vehicle Service Tracker</h2>
                <p className="text-foreground/50 text-sm mt-0.5">
                  Distance covered &amp; remaining for each vehicle's first service · Sorted by urgency
                </p>
              </div>
              <a href="/service-exec" target="_blank"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/20 transition-all">
                <Wrench className="w-3.5 h-3.5" /> Service Exec Portal →
              </a>
            </div>

            {/* Summary stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Vehicles',  value: carsService.length,                                           color: 'text-blue-400',   bg: 'bg-blue-500/10'    },
                { label: 'Service Due',     value: carsService.filter((c:any) => c.isDue).length,                color: 'text-red-400',    bg: 'bg-red-500/10'     },
                { label: 'Due Within 20%',  value: carsService.filter((c:any) => !c.isDue && c.progressPct>=80).length, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                { label: 'All Good',        value: carsService.filter((c:any) => c.progressPct < 80).length,    color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
              ].map(s => (
                <div key={s.label} className={`glass-panel p-4 rounded-2xl border border-border`}>
                  <div className={`inline-flex p-2 ${s.bg} rounded-lg mb-2`}>
                    <Activity className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Vehicle cards */}
            <div className="space-y-3">
              {carsService.map((car: any, idx: number) => {
                const kmRemaining = car.remainingKm
                const interval    = car.nextServiceAt - car.lastServiceKm
                const pct         = car.progressPct

                return (
                  <motion.div key={car.evId}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`glass-panel rounded-2xl border overflow-hidden transition-all
                      ${car.isDue        ? 'border-red-500/40 bg-red-500/3'
                      : pct >= 80        ? 'border-yellow-500/30'
                      :                    'border-border'}`}>

                    {/* Top accent line */}
                    <div className={`h-1 w-full bg-gradient-to-r
                      ${car.isDue ? 'from-red-500 to-red-400'
                      : pct >= 80 ? 'from-yellow-500 to-orange-400'
                      :             'from-blue-500 to-emerald-500'}`} />

                    <div className="p-5">
                      {/* Car header row */}
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0
                            ${car.isDue ? 'bg-red-500/10' : pct >= 80 ? 'bg-yellow-500/10' : 'bg-secondary'}`}>
                            <Car className={`w-5 h-5
                              ${car.isDue ? 'text-red-400' : pct >= 80 ? 'text-yellow-400' : 'text-foreground/50'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold">{car.make} {car.model}</p>
                              {car.nickname && <span className="text-xs text-blue-400 font-semibold">{car.nickname}</span>}
                              {car.isDue && (
                                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                  ⚠️ SERVICE DUE
                                </span>
                              )}
                              {!car.isDue && pct >= 80 && (
                                <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-bold">
                                  DUE SOON
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground/50 mt-0.5">
                              {car.ownerName} · <span className="text-foreground/30">{car.ownerEmail}</span>
                            </p>
                            <p className="text-xs text-foreground/30 mt-0.5">
                              Last service: {car.lastServiceDate
                                ? new Date(car.lastServiceDate).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })
                                : 'Never serviced'}
                              {car.lastServiceKm > 0 && ` at ${car.lastServiceKm.toLocaleString()} km`}
                            </p>
                          </div>
                        </div>

                        {/* Total odometer badge */}
                        <div className="text-right shrink-0">
                          <p className="text-xs text-foreground/40 mb-0.5">Total Odometer</p>
                          <p className="text-xl font-black">{car.totalKm.toLocaleString()}</p>
                          <p className="text-xs text-foreground/40">km</p>
                        </div>
                      </div>

                      {/* Distance covered / remaining stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-background/50 rounded-xl p-3 border border-border text-center">
                          <p className="text-xs text-foreground/40 mb-1">Current KM</p>
                          <p className="text-lg font-black text-blue-400">{car.totalKm.toLocaleString()}</p>
                          <p className="text-xs text-foreground/40">km on odometer</p>
                        </div>
                        <div className={`rounded-xl p-3 border text-center
                          ${car.isDue ? 'bg-red-500/10 border-red-500/20' : pct >= 80 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-background/50 border-border'}`}>
                          <p className="text-xs text-foreground/40 mb-1">Remaining</p>
                          <p className={`text-lg font-black ${car.isDue ? 'text-red-400' : pct >= 80 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {car.isDue ? 'OVERDUE' : kmRemaining.toLocaleString()}
                          </p>
                          <p className="text-xs text-foreground/40">{car.isDue ? 'needs service now' : 'km until service'}</p>
                        </div>
                        <div className="bg-background/50 rounded-xl p-3 border border-border text-center">
                          <p className="text-xs text-foreground/40 mb-1">Next Service At</p>
                          <p className="text-lg font-black text-purple-400">{car.nextServiceAt.toLocaleString()}</p>
                          <p className="text-xs text-foreground/40">km</p>
                        </div>
                      </div>

                      {/* Progress bar with km labels */}
                      <div>
                        <div className="flex justify-between text-xs text-foreground/40 mb-2">
                          <span className="font-semibold">{car.lastServiceKm.toLocaleString()} km</span>
                          <span className="font-bold text-foreground/60">{pct.toFixed(0)}% of {interval.toLocaleString()} km interval used</span>
                          <span className="font-semibold">{car.nextServiceAt.toLocaleString()} km</span>
                        </div>
                        <div className="relative h-5 bg-background/60 rounded-full overflow-hidden border border-border">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.04 }}
                            className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r
                              ${car.isDue ? 'from-red-600 to-red-400' : pct >= 80 ? 'from-yellow-500 to-orange-400' : 'from-blue-500 to-emerald-400'}`}
                          />
                          {/* Current position marker */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-white drop-shadow z-10 mix-blend-difference">
                              {car.totalKm.toLocaleString()} km
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs mt-1.5">
                          <span className="text-foreground/30">Service interval start</span>
                          {!car.isDue && (
                            <span className={`font-semibold ${pct >= 80 ? 'text-yellow-400' : 'text-foreground/50'}`}>
                              {kmRemaining.toLocaleString()} km remaining
                            </span>
                          )}
                          <span className="text-foreground/30">Service due</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {carsService.length === 0 && (
                <div className="glass-panel p-16 rounded-2xl text-center">
                  <Car className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
                  <p className="text-foreground/40 font-semibold">No vehicles registered yet</p>
                  <p className="text-foreground/25 text-sm mt-1">Service data will appear here once users add their EVs</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Service Reminders tab ── */}
        {tab === 'reminders' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-bold text-lg">{reminders.length} Service Reminders</h2>
                <p className="text-foreground/50 text-sm mt-1">All service milestone notifications sent across the platform</p>
              </div>
              <div className="divide-y divide-border">
                {reminders.map(r => (
                  <div key={r.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{r.userName}</p>
                        <span className="text-xs text-foreground/40">·</span>
                        <p className="text-sm text-foreground/60">{r.make} {r.model}</p>
                      </div>
                      <p className="text-xs text-foreground/40">{r.email}</p>
                      <p className="text-xs text-foreground/50 mt-0.5">
                        Milestone: {r.milestone.toLocaleString()} km
                        {r.sentAt && ` · Sent ${new Date(r.sentAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {r.emailSent
                        ? <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold"><Mail className="w-3.5 h-3.5" /> Email sent</span>
                        : <span className="text-xs text-yellow-400">⏳ Pending</span>}
                      {r.dismissed
                        ? <span className="text-xs text-foreground/30">Dismissed by user</span>
                        : <span className="text-xs text-blue-400">Active</span>}
                    </div>
                  </div>
                ))}
                {reminders.length === 0 && (
                  <div className="p-12 text-center text-foreground/40">
                    <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No service reminders triggered yet.</p>
                    <p className="text-xs mt-1">Reminders are sent automatically when users' cars reach service milestones.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Access tab ── */}
        {tab === 'access' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-lg">

            {/* Non-admin notice */}
            {!stats && (
              <div className="glass-panel p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
                <p className="text-yellow-400 font-bold text-sm mb-1">⚠️ Admin Access Required</p>
                <p className="text-foreground/60 text-sm">You are not yet an admin. Enter the admin secret below to unlock the portal.</p>
              </div>
            )}

            <div className="glass-panel p-6 rounded-2xl">
              <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-red-400" /> Grant Admin Access</h2>
              <p className="text-sm text-foreground/50 mb-4">Enter the admin secret to elevate your account.</p>
              <div className="flex gap-3">
                <input type="password" placeholder="Admin secret…" value={secret} onChange={e => setSecret(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleMakeAdmin()}
                  className="flex-1 bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
                <button onClick={handleMakeAdmin}
                  className="px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-bold transition-all">
                  Grant
                </button>
              </div>
              {secretMsg && <p className={`text-sm mt-3 font-semibold ${secretMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{secretMsg}</p>}
            </div>

            {stats && (
              <div className="glass-panel p-6 rounded-2xl">
                <h2 className="font-bold text-lg mb-4">Admin Users</h2>
                {users.filter(u => u.isAdmin).map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div>
                      <p className="font-semibold text-sm">{u.name}</p>
                      <p className="text-xs text-foreground/50">{u.email}</p>
                    </div>
                    <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-full font-bold">Admin</span>
                  </div>
                ))}
                {users.filter(u => u.isAdmin).length === 0 && (
                  <p className="text-foreground/40 text-sm">No admin users yet.</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
