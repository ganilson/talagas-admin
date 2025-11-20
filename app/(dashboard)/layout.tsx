"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { getStoredUser, type UserData } from "@/lib/auth"
import { WebSocketProvider } from "@/lib/websocket-context"
import { initGlobalSocket, registerGlobalSocketCallbacks } from "@/lib/socket-global"
import { requestNotificationPermission } from "@/lib/notifications"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { GlobalOrderNotification } from "@/components/global-order-notification"

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

  useEffect(() => {
    // Solicitar permissão para notificações
    requestNotificationPermission()

    // Inicializar socket global
    const user = getStoredUser()
    if (user?.estabelecimentoId) {
      initGlobalSocket(user.estabelecimentoId)

      // Registrar callbacks globais
      registerGlobalSocketCallbacks({
        onNovoPedido: (payload) => {
          console.log("Callback global: novo pedido", payload)
        },
        onPedidoAtualizado: (payload) => {
          console.log("Callback global: pedido atualizado", payload)
        },
        onPedidoCriado: (payload) => {
          console.log("Callback global: pedido criado", payload)
        },
      })
    }

    // Cleanup ao desmontar
    return () => {
      // Não desconectar, manter o socket vivo
    }
  }, [])

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
      <SidebarProvider>
        <AppSidebar
          access={userData.user.cargo.access}
          userName={`${userData.user.nome} ${userData.user.sobrenome}`}
          userRole={userData.user.cargo.titulo}
        />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
        <GlobalOrderNotification />
      </SidebarProvider>
    </WebSocketProvider>
  )
}
