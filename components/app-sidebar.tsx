"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MaterialIcon } from "./material-icon"
import { cn } from "@/lib/utils"
import type { AccessItem } from "@/lib/auth"
import Image from "next/image"
import logoImage from "@/public/simbolo.png"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  access: AccessItem[]
  userName: string
  userRole: string
}

export function AppSidebar({ access, userName, userRole, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-16 items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <Image src={logoImage} alt="TalaGás" width={36} height={36} className="object-contain" />
          </div>
          <div className="flex flex-col overflow-hidden transition-all group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="truncate text-sm font-semibold text-sidebar-foreground">TalaGás</span>
            <span className="truncate text-xs text-muted-foreground">Sistema Admin</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarMenu>
          {access.map((item) => {
            const isActive = pathname === item.Route
            return (
              <SidebarMenuItem key={item.Route}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.PageName}
                  className="h-12"
                >
                  <Link href={item.Route}>
                    <MaterialIcon icon={item.icon} className="text-xl" />
                    <span>{item.PageName}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2 transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MaterialIcon icon="person" className="text-lg text-primary" />
            </div>
            <div className="flex flex-col overflow-hidden transition-all group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
              <span className="truncate text-sm font-medium text-sidebar-foreground">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">{userRole}</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
