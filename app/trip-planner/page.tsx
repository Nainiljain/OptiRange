import Link from "next/link"
import { redirect } from "next/navigation"
import { Zap, Map, MapPin, Activity, Settings2, LogOut } from "lucide-react"
import { getUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { EvData, HealthData } from "@/lib/models"
import { logoutAction, getSavedLocationsAction, getRecentSearchesAction } from "@/app/actions"
import TripPlannerClient from "./TripPlannerClient"

export default async function TripPlanner({
  searchParams,
}: {
  searchParams: { carId?: string }
}) {
  const user = await getUser()
  if (!user) redirect('/login')

  await connectDB()

  // Fetch ALL cars for this user
  const allCars = await EvData.find({ userId: user.id }).sort({ createdAt: 1 }).lean() as any[]
  if (allCars.length === 0) redirect('/ev-setup')

  const healthData = await HealthData.findOne({ userId: user.id }).lean() as any
  if (!healthData) redirect('/health-setup')

  // Determine initially selected car: ?carId param → matching car → else last added
  const requestedId = searchParams?.carId
  const initialCar  = requestedId
    ? (allCars.find((c: any) => c._id.toString() === requestedId) ?? allCars[allCars.length - 1])
    : allCars[allCars.length - 1]

  // Serialise ObjectIds to strings for client props
  const serialisedCars    = allCars.map((c: any) => ({ ...c, _id: c._id.toString(), userId: c.userId.toString() }))
  const serialisedInitial = { ...initialCar, _id: initialCar._id.toString(), userId: initialCar.userId.toString() }
  const serialisedHealth  = healthData ? { ...healthData, _id: healthData._id.toString(), userId: healthData.userId.toString() } : null
  const serialisedUser    = { id: user.id, name: user.name, email: user.email, profilePic: user.profilePic ?? null }

  // Fetch saved locations and recent searches
  const savedLocations  = await getSavedLocationsAction()
  const recentSearches  = await getRecentSearchesAction()

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl p-6 z-20">
        <Link href="/" className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity">
          <Zap className="h-6 w-6 text-blue-500" />
          <span className="text-xl font-bold tracking-tight">OptiRange</span>
        </Link>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors">
            <Activity className="h-5 w-5" /> Overview
          </Link>
          <Link href="/trip-planner" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 font-medium border border-blue-500/20 shadow-inner">
            <Map className="h-5 w-5" /> Trip Planner
          </Link>
          <Link href="/ev-setup" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors">
            <Settings2 className="h-5 w-5" /> Add Vehicle
          </Link>
          <Link href="/health-setup" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors">
            <Activity className="h-5 w-5" /> Health Profile
          </Link>
        </nav>
        <div className="mt-auto">
          <form action={logoutAction} className="mt-4">
            <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors">
              <LogOut className="h-5 w-5" /> Sign Out
            </button>
          </form>
          <div className="flex items-center gap-3 p-3 mt-4 rounded-xl bg-secondary border border-border">
            {user.profilePic ? (
              <img src={user.profilePic} alt={user.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <span className="font-semibold text-blue-500">{user.name.charAt(0)}</span>
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-foreground/50 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative">
        <div className="absolute top-[-100px] left-[-100%] w-[1000px] h-[1000px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none" />
        <header className="mb-8 md:mb-10 flex items-center gap-4 relative z-10">
          <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-lg">
            <MapPin className="h-8 w-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-1 tracking-tight">Intelligent Trip Planner</h1>
            <p className="text-foreground/60 font-medium">
              {allCars.length > 1
                ? `${allCars.length} vehicles available — select the one you want to drive`
                : `Planning with your ${initialCar.make} ${initialCar.model}`}
            </p>
          </div>
        </header>
        <div className="relative z-10">
          <TripPlannerClient
            user={serialisedUser}
            allEvData={serialisedCars}
            initialEvData={serialisedInitial}
            healthData={serialisedHealth}
            savedLocations={savedLocations}
            recentSearches={recentSearches}
          />
        </div>
      </main>
    </div>
  )
}
