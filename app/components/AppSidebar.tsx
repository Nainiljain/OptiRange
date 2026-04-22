import Link from "next/link"
import { Zap, Map, Activity, Settings2, LogOut, Shield } from "lucide-react"
import { logoutAction } from "@/app/actions"

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Overview",      icon: Activity,  page: "dashboard"    },
  { href: "/trip-planner", label: "Trip Planner",  icon: Map,       page: "trip-planner" },
  { href: "/ev-setup",     label: "Add Vehicle",   icon: Settings2, page: "ev-setup"     },
  { href: "/health-setup", label: "Health Profile", icon: Activity, page: "health-setup" },
] as const

interface AppSidebarProps {
  activePage: string
  user: { firstName: string; lastName: string; email: string; profilePic?: string | null; isAdmin?: boolean }
}

export default function AppSidebar({ activePage, user }: AppSidebarProps) {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl p-6 z-20">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
        <Zap className="h-6 w-6 text-blue-500" />
        <span className="text-xl font-bold tracking-tight">OptiRange</span>
      </Link>

      {/* User card → profile */}
      <Link href="/profile"
        className="flex items-center gap-3 p-3 mb-6 rounded-xl border border-transparent hover:bg-secondary hover:border-border transition-all group">
        {user.profilePic ? (
          <img src={user.profilePic} alt="Profile" className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <span className="font-semibold text-blue-500">{(user.firstName || user.email).charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="overflow-hidden flex-1">
          <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-foreground/50 truncate">{user.email}</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.page === activePage
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={isActive
                ? "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 font-medium border border-blue-500/20"
                : "flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
              }>
              <Icon className="h-5 w-5" /> {item.label}
            </Link>
          )
        })}

        {/* Admin portal link — only visible to admins */}
        {user.isAdmin && (
          <Link href="/admin"
            className={activePage === 'admin'
              ? "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-500/10 text-red-400 font-medium border border-red-500/20"
              : "flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500/60 hover:text-red-400 hover:bg-red-500/5 transition-colors"
            }>
            <Shield className="h-5 w-5" /> Admin Portal
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="mt-auto">
        <form action={logoutAction} className="mt-4">
          <button type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
