"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { registerGlobalSocketCallbacks } from "@/lib/socket-global"
import { MaterialIcon } from "@/components/material-icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OrderNotification {
    id: string
    codigoPedido: string
    cliente: string
    valor: number
    itens: number
}

export function GlobalOrderNotification() {
    const [notification, setNotification] = useState<OrderNotification | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const router = useRouter()

    useEffect(() => {
        registerGlobalSocketCallbacks({
            onNovoPedido: (payload) => {
                // Payload structure based on logs: payload.data.codigoPedido, etc.
                const data = payload?.data
                if (data) {
                    setNotification({
                        id: data._id || data.id,
                        codigoPedido: data.codigoPedido || "Novo",
                        cliente: data.nomeCompleto || "Cliente",
                        valor: data.total || 0,
                        itens: data.produtos?.length || 0,
                    })
                    setIsVisible(true)

                    // Auto-hide after 10 seconds if not interacted
                    const timer = setTimeout(() => {
                        setIsVisible(false)
                    }, 10000)
                    return () => clearTimeout(timer)
                }
            },
        })
    }, [])

    if (!notification) return null

    return (
        <div
            className={cn(
                "fixed bottom-4 right-4 z-50 w-80 transform transition-all duration-500 ease-in-out md:bottom-8 md:right-8",
                isVisible ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0"
            )}
        >
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                {/* Header */}
                <div className="bg-primary px-4 py-3 text-primary-foreground">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 animate-pulse">
                            <MaterialIcon icon="notifications_active" className="text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold leading-none">Novo Pedido!</h3>
                            <p className="text-xs text-primary-foreground/80">Acabou de chegar</p>
                        </div>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-primary-foreground/80 hover:text-white"
                        >
                            <MaterialIcon icon="close" className="text-lg" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    <div className="mb-4 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Pedido #{notification.codigoPedido}</p>
                            <h4 className="text-lg font-bold text-card-foreground">{notification.cliente}</h4>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">Valor</p>
                            <p className="text-lg font-bold text-primary">
                                {new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(notification.valor)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MaterialIcon icon="shopping_bag" className="text-base" />
                        <span>{notification.itens} item(s)</span>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <Button
                            className="w-full"
                            onClick={() => {
                                setIsVisible(false)
                                router.push("/pedidos")
                            }}
                        >
                            Ver Pedido
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setIsVisible(false)}
                        >
                            Fechar
                        </Button>
                    </div>
                </div>

                {/* Progress bar for auto-dismiss (visual only) */}
                <div className="h-1 w-full bg-muted">
                    <div
                        className={cn("h-full bg-primary transition-all duration-[10000ms] ease-linear", isVisible ? "w-0" : "w-full")}
                        style={{ width: isVisible ? '0%' : '100%' }}
                    />
                </div>
            </div>
        </div>
    )
}
