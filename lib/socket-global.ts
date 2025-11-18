import { io, Socket } from "socket.io-client"
import { showNotification } from "./notifications"

let globalSocket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

export interface GlobalSocketCallbacks {
  onNovoPedido?: (payload: any) => void
  onPedidoAtualizado?: (payload: any) => void
  onPedidoCriado?: (payload: any) => void
}

const globalCallbacks: GlobalSocketCallbacks = {}

/**
 * Inicializa o socket global que funciona em qualquer página
 * Deve ser chamado uma vez no layout raiz
 */
export function initGlobalSocket(estabId: string): void {
  if (globalSocket?.connected) {
    console.log("✅ Socket global já conectado")
    globalSocket.emit("join-estabelecimento", estabId)
    return
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"
  const token = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}")?.token : ""

  try {
    globalSocket = io(apiUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      transports: ["websocket", "polling"],
    })

    globalSocket.on("connect", () => {
      console.log("✅ Socket global conectado:", globalSocket?.id)
      reconnectAttempts = 0
      if (globalSocket) {
        globalSocket.emit("join-estabelecimento", estabId)
        console.log("📍 Socket global entrou na sala estabelecimento:", estabId)
      }
    })

    globalSocket.on("disconnect", (reason) => {
      console.warn("❌ Socket global desconectado:", reason)
    })

    globalSocket.on("connect_error", (error) => {
      console.error("❌ Erro de conexão socket global:", error)
      reconnectAttempts++
    })

    globalSocket.on("error", (error) => {
      console.error("❌ Erro no socket global:", error)
    })

    // Listeners globais
    globalSocket.on("novo-pedido", (payload) => {
      console.log("🔔 Novo pedido recebido (GLOBAL):", payload)
      
      // Mostrar notificação push mesmo em background
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🔔 TALAGÁS - Novo Pedido", {
          body: `Pedido: ${payload?.data?.codigoPedido ?? "novo"}\nCliente: ${payload?.data?.nomeCompleto ?? "-"}`,
          icon: "/simbolo.png",
          badge: "/simbolo.png",
          tag: "novo-pedido",
          requireInteraction: true,
        })
      }

      // Tocar som de notificação
      playNotificationSound()

      // Executar callbacks registrados
      globalCallbacks.onNovoPedido?.(payload)
    })

    globalSocket.on("pedido-atualizado", (payload) => {
      console.log("🔄 Pedido atualizado (GLOBAL):", payload)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🔄 TALAGÁS - Pedido Atualizado", {
          body: `Pedido: ${payload?.data?.codigoPedido ?? "atualizado"}`,
          icon: "/simbolo.png",
        })
      }
      globalCallbacks.onPedidoAtualizado?.(payload)
    })

    globalSocket.on("pedido-criado", (payload) => {
      console.log("✨ Pedido criado (GLOBAL):", payload)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("✨ TALAGÁS - Pedido Criado", {
          body: `Pedido: ${payload?.data?.codigoPedido ?? "criado"}`,
          icon: "/simbolo.png",
        })
      }
      globalCallbacks.onPedidoCriado?.(payload)
    })
  } catch (err) {
    console.error("❌ Erro ao inicializar socket global:", err)
  }
}

/**
 * Registra callbacks que serão executados quando eventos chegarem
 */
export function registerGlobalSocketCallbacks(callbacks: GlobalSocketCallbacks): void {
  Object.assign(globalCallbacks, callbacks)
}

/**
 * Desregistra callbacks
 */
export function unregisterGlobalSocketCallbacks(): void {
  Object.keys(globalCallbacks).forEach((key) => {
    delete (globalCallbacks as any)[key]
  })
}

export function getGlobalSocket(): Socket | null {
  return globalSocket
}

export function isGlobalSocketConnected(): boolean {
  return globalSocket?.connected ?? false
}

/**
 * Reproduz som de notificação
 */
function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Som mais alto e notável
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
    
    oscillator.type = "sine"
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (err) {
    console.warn("Áudio não suportado:", err)
  }
}

/**
 * Cleanup do socket
 */
export function disconnectGlobalSocket(): void {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
  }
}
