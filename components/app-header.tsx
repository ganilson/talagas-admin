"use client"

import { MaterialIcon } from "./material-icon"
import { Button } from "./ui/button"
import { useTheme } from "./theme-provider"
import { logout } from "@/lib/auth"
import { useRouter } from "next/navigation"

interface AppHeaderProps {
  title: string
  subtitle?: string
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/auth?TIPO=FUNCIONARIO")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <MaterialIcon icon={theme === "dark" ? "light_mode" : "dark_mode"} />
        </Button>

        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <MaterialIcon icon="logout" />
        </Button>
      </div>
    </header>
  )
}
