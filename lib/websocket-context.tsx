"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"

interface Order {
  id: string
  cliente: string
  endereco: string
  bairro: string
  telefone: string
  itens: { tipo: string; quantidade: number; preco: number }[]
  valor: number
  status: "pendente" | "aceito" | "em_entrega" | "entregue" | "cancelado"
  horario: string
  entregador?: string
  metodoPagamento: "dinheiro" | "transferencia" | "multicaixa"
  createdAt: Date
  updatedAt: Date
  tempoEntrega?: number
  observacoes?: string
}

interface WebSocketMessage {
  type: "new_order" | "order_updated" | "order_status_changed" | "ping"
  data?: any
}

interface WebSocketContextType {
  isConnected: boolean
  lastMessage: WebSocketMessage | null
  sendMessage: (message: WebSocketMessage) => void
  connectionStatus: "connecting" | "connected" | "disconnected" | "error"
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "disconnected",
  )
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const connect = useCallback(() => {
    // In a real app, this would connect to your WebSocket server
    // For demo purposes, we'll simulate WebSocket behavior
    console.log("WebSocket: Attempting to connect...")
    setConnectionStatus("connecting")

    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true)
      setConnectionStatus("connected")
      setReconnectAttempts(0)
      console.log("WebSocket: Connected successfully")

      toast({
        title: "Conectado",
        description: "Conexão em tempo real estabelecida",
      })
    }, 1000)

    // Simulate receiving messages
    const messageInterval = setInterval(() => {
      if (Math.random() < 0.1) {
        // 10% chance every 5 seconds
        const mockMessage: WebSocketMessage = {
          type: "new_order",
          data: {
            id: Date.now().toString(),
            cliente: ["Carlos Lima", "Paula Oliveira", "Roberto Alves"][Math.floor(Math.random() * 3)],
            status: "pendente",
          },
        }
        setLastMessage(mockMessage)
      }
    }, 5000)

    // Cleanup function
    return () => {
      clearInterval(messageInterval)
    }
  }, [toast])

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close()
      setWs(null)
    }
    setIsConnected(false)
    setConnectionStatus("disconnected")
    console.log("WebSocket: Disconnected")
  }, [ws])

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (isConnected) {
        console.log("WebSocket: Sending message", message)
        // In a real app, you would send via ws.send(JSON.stringify(message))
      } else {
        console.warn("WebSocket: Cannot send message, not connected")
      }
    },
    [isConnected],
  )

  // Auto-connect on mount
  useEffect(() => {
    const cleanup = connect()

    return () => {
      if (cleanup) cleanup()
      disconnect()
    }
  }, [connect, disconnect])

  // Auto-reconnect on disconnect
  useEffect(() => {
    if (!isConnected && connectionStatus === "disconnected" && reconnectAttempts < 5) {
      const timeout = setTimeout(
        () => {
          console.log(`WebSocket: Reconnecting... (attempt ${reconnectAttempts + 1})`)
          setReconnectAttempts((prev) => prev + 1)
          connect()
        },
        Math.min(1000 * Math.pow(2, reconnectAttempts), 30000),
      ) // Exponential backoff, max 30s

      return () => clearTimeout(timeout)
    }
  }, [isConnected, connectionStatus, reconnectAttempts, connect])

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage, connectionStatus }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}
