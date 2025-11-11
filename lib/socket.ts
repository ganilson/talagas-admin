import { API_BASE_URL } from "@/lib/api"
import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export function initSocket(estabelecimentoId: string, handlers?: {
  onConnect?: () => void
  onDisconnect?: () => void
  onNovoPedido?: (payload: any) => void
  onPedidoAtualizado?: (payload: any) => void
}) {
  // disconnect previous if exists
  if (socket) {
    try { socket.disconnect() } catch (e) {}
    socket = null
  }

  // inicializa socket com a mesma base que a API
  // garante que a url não tenha dupla barra
  const base = API_BASE_URL.replace(/\/$/, "")
  socket = io(base, {
    transports: ["websocket"],
    // optional: autoConnect: true
  })

  socket.on("connect", () => {
    // entrar na sala do estabelecimento
    try {
      socket?.emit("join-estabelecimento", estabelecimentoId)
    } catch (e) {}
    handlers?.onConnect?.()
  })

  socket.on("disconnect", () => {
    handlers?.onDisconnect?.()
  })

  socket.on(`novo-pedido-${estabelecimentoId}`, (payload: any) => {
    handlers?.onNovoPedido?.(payload)
  })

  socket.on(`pedido-atualizado-${estabelecimentoId}`, (payload: any) => {
    handlers?.onPedidoAtualizado?.(payload)
  })

  // retorna função de cleanup
  return () => {
    if (!socket) return
    try {
      socket.off(`novo-pedido-${estabelecimentoId}`)
      socket.off(`pedido-atualizado-${estabelecimentoId}`)
      socket.disconnect()
    } catch (e) {}
    socket = null
  }
}

export function emitEvent(event: string, payload?: any) {
  try {
    socket?.emit(event, payload)
  } catch (e) {}
}
