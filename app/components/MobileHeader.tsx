import Link from "next/link"
import { Zap } from "lucide-react"
import { logoutAction } from "@/app/actions"

/**
 * Sticky mobile header with branding and logout.
 * Only visible on small screens (md:hidden).
 */
export default function MobileHeader() {
  return (
    <header className="md:hidden flex items-center justify-between mb-8 relative z-10">
      <Link href="/" className="flex items-center gap-2" aria-label="OptiRange home">
        <Zap className="h-6 w-6 text-blue-500" aria-hidden="true" />
        <span className="text-xl font-bold">OptiRange</span>
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-sm text-red-500 font-medium bg-red-500/10 px-3 py-1.5 rounded-lg"
          aria-label="Sign out"
        >
          Logout
        </button>
      </form>
    </header>
  )
}
