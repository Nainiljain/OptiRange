import Link from "next/link"
import { redirect } from "next/navigation"
import { Zap, Map, Battery, Activity, Plus, Car, Shield } from "lucide-react"
import { getUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { EvData, HealthData, Trip, ServiceReminder } from "@/lib/models"
import AppSidebar from "@/app/components/AppSidebar"
import MobileHeader from "@/app/components/MobileHeader"
import StatCard from "@/app/components/StatCard"
import GarageCard from "@/app/dashboard/components/GarageCard"
import RecentTrips from "@/app/dashboard/components/RecentTrips"
import ServiceBanner from "@/app/components/ServiceBanner"
import ServiceStatusCard from "@/app/components/ServiceStatusCard"

export default async function Dashboard() {
  const user = await getUser()
  if (!user) redirect('/login')

  await connectDB()

  // Fetch ALL cars for this user
  const allCars = await EvData.find({ userId: user.id }).sort({ createdAt: 1 }).lean() as any[]
  if (allCars.length === 0) redirect('/ev-setup')

  const healthData = await HealthData.findOne({ userId: user.id }).lean() as any
  if (!healthData) redirect('/health-setup')

  const trips = await Trip.find({ userId: user.id }).sort({ createdAt: -1 }).limit(5).lean() as any[]

  const totalDistance   = trips.reduce((acc: number, t: any) => acc + (t.distance || 0), 0).toFixed(0)
  const totalBatteryUsed = trips.reduce((acc: number, t: any) => acc + (t.batteryUsed || 0), 0).toFixed(1)

  // Primary car = most recently added
  const primaryCar = allCars[allCars.length - 1]

  // Fetch service reminders for this user
  const rawReminders = await ServiceReminder.find({ userId: user.id, dismissed: false }).lean() as any[]
  const serviceReminders = rawReminders.map((r: any) => ({
    id:        r._id.toString(),
    evId:      r.evId.toString(),
    milestone: r.milestone,
    emailSent: r.emailSent || false,
  }))

  // Check if admin for portal link
  const { User: UserModel } = await import('@/lib/models')
  const fullUser = await UserModel.findById(user.id).select('isAdmin isServiceExec').lean() as any
  const isAdmin = fullUser?.isAdmin || false
  const isServiceExec = fullUser?.isServiceExec || false

  // Serialise cars for GarageCards (must be before carServiceStatuses)
  const serialisedCars = allCars.map((c: any) => ({
    _id: c._id.toString(),
    nickname: c.nickname || undefined,
    make: c.make,
    model: c.model,
    batteryCapacity: c.batteryCapacity,
    rangeAtFull: c.rangeAtFull,
    carPic: c.carPic || null,
  }))

  // Get per-car service status for the customer view
  const { ServiceRecord } = await import('@/lib/models')
  const { getServiceThresholds, getBookingUrl } = await import('@/lib/serviceReminder')

  const carServiceStatuses = await Promise.all(serialisedCars.map(async (car: any) => {
    const carTrips = await Trip.find({ evId: car._id, userId: user.id }).lean() as any[]
    const totalKm = carTrips.reduce((acc: number, t: any) => acc + ((t.distance || 0) * 1.60934), 0)
    const lastService = await ServiceRecord.findOne({ evId: car._id }).sort({ servicedAt: -1 }).lean() as any
    const lastServiceKm = lastService?.odometerKm ?? 0
    const thresholds = getServiceThresholds(car.make || '')
    const interval = thresholds[0]
    const nextServiceAt = lastServiceKm + interval
    const remainingKm = Math.max(0, nextServiceAt - totalKm)
    const kmSinceLastService = totalKm - lastServiceKm
    const progressPct = Math.min(100, (kmSinceLastService / interval) * 100)
    const history = await ServiceRecord.find({ evId: car._id }).sort({ servicedAt: -1 }).lean() as any[]
    return {
      evId: car._id,
      make: car.make || '',
      model: car.model || '',
      nickname: car.nickname || '',
      totalKm: Math.round(totalKm),
      lastServiceKm: Math.round(lastServiceKm),
      lastServiceDate: lastService?.servicedAt?.toISOString?.() ?? null,
      nextServiceAt: Math.round(nextServiceAt),
      remainingKm: Math.round(remainingKm),
      kmSinceLastService: Math.round(kmSinceLastService),
      progressPct: Math.round(progressPct),
      isDue: remainingKm === 0,
      bookingUrl: getBookingUrl(car.make || ''),
      serviceHistory: history.map((h: any) => ({
        id: h._id.toString(),
        odometerKm: h.odometerKm,
        milestone: h.milestone,
        notes: h.notes,
        servicedAt: h.servicedAt?.toISOString?.() ?? null,
      })),
    }
  }))

  // Serialise trips for the RecentTrips component
  const serialisedTrips = trips.map((t: any) => ({
    _id: t._id.toString(),
    startLocation: t.startLocation,
    endLocation: t.endLocation,
    distance: t.distance,
    estimatedTime: t.estimatedTime,
    batteryUsed: t.batteryUsed,
    createdAt: t.createdAt?.toISOString?.() ?? String(t.createdAt),
  }))

  // serialisedCars defined above

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
      {/* ── Sidebar ── */}
      <AppSidebar
        activePage="dashboard"
        user={{ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email, profilePic: user.profilePic ?? null, isAdmin }}
      />

      {/* ── Main ── */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative" id="main-content">
        {/* Background glow */}
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" aria-hidden="true" />

        {/* Mobile header */}
        <MobileHeader />

        {/* ── Service Reminder Banner ── */}
        <ServiceBanner
          reminders={serviceReminders}
          cars={serialisedCars}
        />

        {/* ── Admin Portal Link (admins only) ── */}
        {isAdmin && (
          <div className="mb-6 relative z-10">
            <Link href="/admin"
              className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all group">
              <div className="p-2 bg-red-500/10 rounded-xl"><Shield className="w-5 h-5 text-red-400" /></div>
              <div className="flex-1">
                <p className="font-bold text-sm text-red-300">Admin Portal</p>
                <p className="text-xs text-foreground/40">Manage users, fleet, service reminders</p>
              </div>
              <span className="text-xs text-red-400/60 font-semibold group-hover:text-red-400 transition-colors">Open →</span>
            </Link>
          </div>
        )}

        {/* ── Header ── */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-4 relative z-10">
          <div className="flex items-center gap-4">
            {primaryCar.carPic && (
              <img
                src={primaryCar.carPic}
                alt={`${primaryCar.make} ${primaryCar.model}`}
                className="w-16 h-16 rounded-2xl object-cover border border-border shadow-sm hidden sm:block"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold mb-1">Welcome back, {user.firstName}</h1>
              <p className="text-foreground/60 flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Battery className="w-3 h-3" aria-hidden="true" /> {allCars.length} vehicle{allCars.length > 1 ? 's' : ''} registered
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/trip-planner"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 font-medium"
          >
            <Map className="h-4 w-4" aria-hidden="true" /> New Trip Plan
          </Link>
        </header>

        {/* ── Stats ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10" aria-label="Trip statistics">
          <StatCard title="Total Distance Logged" value={totalDistance} unit="mi"  icon={Map}      color="blue"    />
          <StatCard title="Energy Consumed"       value={totalBatteryUsed} unit="kWh" icon={Battery}  color="emerald" />
          <StatCard title="Completed Trips"       value={trips.length}     unit="trips" icon={Activity} color="purple"  />
        </section>

        {/* ── My Garage ── */}
        <section className="relative z-10 mb-10" aria-label="My garage">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Car className="h-5 w-5 text-emerald-500" aria-hidden="true" /> My Garage
              <span className="text-sm font-normal text-foreground/40 ml-1">
                ({allCars.length} vehicle{allCars.length !== 1 ? 's' : ''})
              </span>
            </h2>
            <Link
              href="/ev-setup"
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-xl transition-all"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Vehicle
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {serialisedCars.map((car) => (
              <GarageCard key={car._id} car={car} canDelete={allCars.length > 1} />
            ))}

            {/* Add new car card */}
            <Link
              href="/ev-setup"
              className="glass-panel p-5 rounded-2xl border border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] group"
              aria-label="Add another vehicle"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all" aria-hidden="true">
                <Plus className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-foreground/50 group-hover:text-emerald-500 transition-colors">
                Add Another Vehicle
              </p>
            </Link>
          </div>
        </section>

        {/* ── Recent Trips ── */}
        <RecentTrips trips={serialisedTrips} />

        {/* ── My Vehicle Service Status ── */}
        <section className="relative z-10 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🔧 Vehicle Service Status
            </h2>
            {isServiceExec && (
              <a href="/service-exec"
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-xl transition-all">
                Service Exec Portal →
              </a>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {carServiceStatuses.map((s: any) => (
              <ServiceStatusCard key={s.evId} status={s} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
