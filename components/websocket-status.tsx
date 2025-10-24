"use client"

import { useWebSocket } from "@/lib/websocket-context"
import { MaterialIcon } from "@/components/material-icon"
import { cn } from "@/lib/utils"

export function WebSocketStatus() {
  const { isConnected, connectionStatus } = useWebSocket()

  const statusConfig = {
    connecting: {
      icon: "sync",
      label: "Conectando...",
      className: "text-yellow-600 bg-yellow-50 border-yellow-200",
      iconClassName: "animate-spin",
    },
    connected: {
      icon: "check_circle",
      label: "Conectado",
      className: "text-green-600 bg-green-50 border-green-200",
      iconClassName: "",
    },
    disconnected: {
      icon: "cloud_off",
      label: "Desconectado",
      className: "text-gray-600 bg-gray-50 border-gray-200",
      iconClassName: "",
    },
    error: {
      icon: "error",
      label: "Erro de conexão",
      className: "text-red-600 bg-red-50 border-red-200",
      iconClassName: "",
    },
  }

  const config = statusConfig[connectionStatus]

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm", config.className)}>
      <MaterialIcon icon={config.icon} className={cn("text-base", config.iconClassName)} />
      <span className="font-medium">{config.label}</span>
      {isConnected && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </span>
      )}
    </div>
  )
}
