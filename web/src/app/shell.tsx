import { NavLink, Outlet } from "react-router"

import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { setYourName, useYourName } from "@/lib/your-name"

const PAGES = [
  { to: "/", label: "Overview" },
  { to: "/queue", label: "Queue" },
  { to: "/settings", label: "Settings" },
]

export function Shell() {
  const name = useYourName()
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">Review Triage Agent</span>
          <nav className="flex gap-1">
            {PAGES.map((page) => (
              <NavLink
                key={page.to}
                to={page.to}
                end={page.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm",
                    isActive
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {page.label}
              </NavLink>
            ))}
          </nav>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            You are
            <Input
              className="h-8 w-36"
              value={name}
              placeholder="your name"
              onChange={(event) => setYourName(event.target.value)}
            />
          </label>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
