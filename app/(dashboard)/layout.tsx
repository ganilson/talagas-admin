"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { getStoredUser, type UserData } from "@/lib/auth"
import { WebSocketProvider } from "@/lib/websocket-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const router = useRouter()

  useEffect(() => {
    const user = getStoredUser()
    if (!user) {
      router.push("/auth?TIPO=FUNCIONARIO")
    } else {
      setUserData(user)
    }
  }, [router])

  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <WebSocketProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar
          access={userData.user.cargo.access}
          userName={`${userData.user.nome} ${userData.user.sobrenome}`}
          userRole={userData.user.cargo.titulo}
        />
        <main className="ml-64 flex-1 overflow-y-auto">{children}</main>
      </div>
    </WebSocketProvider>
  )
}
