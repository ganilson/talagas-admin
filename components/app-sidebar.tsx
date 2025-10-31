"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MaterialIcon } from "./material-icon"
import { cn } from "@/lib/utils"
import type { AccessItem } from "@/lib/auth"
import Image from "next/image"
import logoImage from "@/public/simbolo.png"
interface AppSidebarProps {
  access: AccessItem[]
  userName: string
  userRole: string
}

export function AppSidebar({ access, userName, userRole }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar transition-transform">
      <div className="flex h-full flex-col">
        {/* Logo/Header */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center">
            <Image src={logoImage} alt="TalaGás" width={36} height={36} className="object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">TalaGás</span>
            <span className="text-xs text-muted-foreground">Sistema Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {access.map((item) => {
            const isActive = pathname === item.Route
            return (
              <Link
                key={item.Route}
                href={item.Route}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <MaterialIcon icon={item.icon} className="text-xl" />
                <span>{item.PageName}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <MaterialIcon icon="person" className="text-xl text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">{userName}</span>
              <span className="text-xs text-muted-foreground">{userRole}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
