import { API_BASE_URL } from "@/lib/api"
import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export interface SocketCallbacks {
  onNovoPedido?: (payload: any) => void
  onPedidoAtualizado?: (payload: any) => void
  onPedidoCriado?: (payload: any) => void
}

export function initSocket(estabId: string, callbacks: SocketCallbacks): (() => void) | null {
  if (socket?.connected) {
    return () => {
      // já conectado, só configurar listeners
      setupListeners(estabId, callbacks)
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
      reconnectionAttempts: 5,
    })

    socket.on("connect", () => {
      console.log("Socket conectado:", socket?.id)
      // entrar na sala do estabelecimento
      socket?.emit("join-room", { room: `estabelecimento-${estabId}` })
    })

    socket.on("disconnect", () => {
      console.log("Socket desconectado")
    })

    setupListeners(estabId, callbacks)

    return () => {
      // cleanup
      if (socket) {
        socket.off("novo-pedido")
        socket.off("pedido-atualizado")
        socket.off("pedido-criado")
        socket.disconnect()
        socket = null
      }
    }
  } catch (err) {
    console.error("Erro ao inicializar socket:", err)
    return null
  }
}

function setupListeners(estabId: string, callbacks: SocketCallbacks) {
  if (!socket) return

  // Ouve 'novo-pedido' do canal estabelecimento-{estabId}
  socket.on("novo-pedido", (payload) => {
    console.log("Novo pedido recebido:", payload)
    callbacks.onNovoPedido?.(payload)
  })

  // Ouve 'pedido-atualizado' (pode ser de qualquer pedido no estabelecimento)
  socket.on("pedido-atualizado", (payload) => {
    console.log("Pedido atualizado:", payload)
    callbacks.onPedidoAtualizado?.(payload)
  })

  // Ouve 'pedido-criado' de salas específicas pedido-{id}
  socket.on("pedido-criado", (payload) => {
    console.log("Pedido criado:", payload)
    callbacks.onPedidoCriado?.(payload)
  })
}

export function getSocket(): Socket | null {
  return socket
}

export function emitJoinRoom(room: string) {
  if (socket) {
    socket.emit("join-room", { room })
  }
}

export function emitLeaveRoom(room: string) {
  if (socket) {
    socket.emit("leave-room", { room })
  }
}
