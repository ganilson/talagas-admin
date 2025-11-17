import { API_BASE_URL } from "@/lib/api"
import { io, Socket } from "socket.io-client"

let socket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

export interface SocketCallbacks {
  onNovoPedido?: (payload: any) => void
  onPedidoAtualizado?: (payload: any) => void
  onPedidoCriado?: (payload: any) => void
}

export function initSocket(estabId: string, callbacks: SocketCallbacks): (() => void) | null {
  // Se já está conectado, reutiliza a conexão
  if (socket?.connected) {
    console.log("✅ Socket já conectado, configurando listeners para estabelecimento", estabId)
    // Entrar na sala do estabelecimento se ainda não está
    socket.emit("join-estabelecimento", estabId)
    setupListeners(estabId, callbacks)
    return () => {
      // cleanup (não desconecta para reutilizar)
    }
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
  const token = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}")?.token : ""

  try {
    socket = io(apiUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      transports: ["websocket", "polling"],
    })

    socket.on("connect", () => {
      console.log("✅ Socket conectado:", socket?.id)
      reconnectAttempts = 0
      // entrar na sala do estabelecimento
      if (socket) {
        socket.emit("join-estabelecimento", estabId)
        console.log("📍 Entrou na sala estabelecimento:", estabId)
      }
    })

    socket.on("disconnect", (reason) => {
      console.warn("❌ Socket desconectado:", reason)
    })

    socket.on("connect_error", (error) => {
      console.error("❌ Erro de conexão:", error)
      reconnectAttempts++
    })

    socket.on("error", (error) => {
      console.error("❌ Erro no socket:", error)
    })

    setupListeners(estabId, callbacks)

    return () => {
      // cleanup: remover listeners mas não desconectar (para reutilizar conexão)
      if (socket) {
        socket.off("novo-pedido")
        socket.off("pedido-atualizado")
        socket.off("pedido-criado")
      }
    }
  } catch (err) {
    console.error("❌ Erro ao inicializar socket:", err)
    return null
  }
}

function setupListeners(estabId: string, callbacks: SocketCallbacks) {
  if (!socket) return

  // Ouve 'novo-pedido' emitido para o canal estabelecimento-{estabId}
  socket.on("novo-pedido", (payload) => {
    console.log("🔔 Novo pedido recebido:", payload)
    callbacks.onNovoPedido?.(payload)
  })

  // Ouve 'pedido-atualizado'
  socket.on("pedido-atualizado", (payload) => {
    console.log("🔄 Pedido atualizado:", payload)
    callbacks.onPedidoAtualizado?.(payload)
  })

  // Ouve 'pedido-criado'
  socket.on("pedido-criado", (payload) => {
    console.log("✨ Pedido criado:", payload)
    callbacks.onPedidoCriado?.(payload)
  })
}

export function getSocket(): Socket | null {
  return socket
}

/**
 * Entra numa sala específica de pedido
 */
export function emitJoinPedido(pedidoId: string) {
  if (socket?.connected) {
    socket.emit("join-pedido", pedidoId)
    console.log("📍 Entrou na sala pedido:", pedidoId)
  }
}

/**
 * Sai de uma sala específica de pedido
 */
export function emitLeavePedido(pedidoId: string) {
  if (socket?.connected) {
    socket.emit("leave-pedido", pedidoId)
    console.log("📍 Saiu da sala pedido:", pedidoId)
  }
}

export function isConnected(): boolean {
  return socket?.connected ?? false
}
