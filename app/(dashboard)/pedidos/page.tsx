"use client"

import { useState, useEffect, useMemo } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatAOA } from "@/lib/angola-validations"
import { requestNotificationPermission, showNotification, isNotificationSupported } from "@/lib/notifications"
import { AdvertisingBanner } from "@/components/advertising-banner"
import { useWebSocket } from "@/lib/websocket-context"
import { WebSocketStatus } from "@/components/websocket-status"

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

const deliveryPersons = ["João Silva", "Pedro Costa", "Ana Souza", "Carlos Mendes"]
const bairros = ["Centro", "Vila Nova", "Jardim América", "Bela Vista", "Talatona", "Morro Bento", "Viana"]
const tiposBotija = ["Botijão 13kg", "Botijão 6kg", "Botijão 45kg"]

const generateMockOrders = (): Order[] => {
  const orders: Order[] = []
  const now = new Date()

  for (let i = 0; i < 50; i++) {
    const createdAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    const status: Order["status"] = ["pendente", "aceito", "em_entrega", "entregue", "cancelado"][
      Math.floor(Math.random() * 5)
    ] as Order["status"]

    orders.push({
      id: (1250 + i).toString(),
      cliente: ["Maria Silva", "João Santos", "Ana Costa", "Carlos Lima", "Paula Oliveira"][
        Math.floor(Math.random() * 5)
      ],
      endereco: `Rua ${Math.floor(Math.random() * 999)}, ${Math.floor(Math.random() * 999)}`,
      bairro: bairros[Math.floor(Math.random() * bairros.length)],
      telefone: `+244 9${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`,
      itens: [
        {
          tipo: tiposBotija[Math.floor(Math.random() * tiposBotija.length)],
          quantidade: Math.floor(Math.random() * 3) + 1,
          preco: 9500,
        },
      ],
      valor: (Math.floor(Math.random() * 3) + 1) * 9500,
      status,
      horario: createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      entregador:
        status !== "pendente" ? deliveryPersons[Math.floor(Math.random() * deliveryPersons.length)] : undefined,
      metodoPagamento: ["dinheiro", "transferencia", "multicaixa"][
        Math.floor(Math.random() * 3)
      ] as Order["metodoPagamento"],
      createdAt,
      updatedAt: createdAt,
      tempoEntrega: status === "entregue" ? Math.floor(Math.random() * 60) + 15 : undefined,
      observacoes: Math.random() > 0.7 ? "Entregar na portaria" : undefined,
    })
  }

  return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export default function PedidosPage() {
  const { toast } = useToast()
  const { isConnected, lastMessage, sendMessage } = useWebSocket()
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState("")
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())

  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | Order["status"]>("all")
  const [filterBairro, setFilterBairro] = useState<string>("all")
  const [filterEntregador, setFilterEntregador] = useState<string>("all")
  const [filterTipoBotija, setFilterTipoBotija] = useState<string>("all")
  const [filterMetodoPagamento, setFilterMetodoPagamento] = useState<string>("all")
  const [filterPriceMin, setFilterPriceMin] = useState("")
  const [filterPriceMax, setFilterPriceMax] = useState("")
  const [filterDateStart, setFilterDateStart] = useState("")
  const [filterDateEnd, setFilterDateEnd] = useState("")
  const [sortBy, setSortBy] = useState<"createdAt" | "valor" | "tempoEntrega">("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Initialize orders
  useEffect(() => {
    setAllOrders(generateMockOrders())
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if (isNotificationSupported()) {
      requestNotificationPermission()
    }
  }, [])

  useEffect(() => {
    if (lastMessage) {
      console.log("[v0] Received WebSocket message:", lastMessage)

      if (lastMessage.type === "new_order" && lastMessage.data) {
        const newOrder: Order = {
          id: lastMessage.data.id,
          cliente: lastMessage.data.cliente,
          endereco: `Rua ${Math.floor(Math.random() * 999)}, ${Math.floor(Math.random() * 999)}`, // Placeholder address, ideally from message
          bairro: bairros[Math.floor(Math.random() * bairros.length)], // Placeholder bairro, ideally from message
          telefone: `+244 9${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`, // Placeholder phone, ideally from message
          itens: [
            {
              tipo: tiposBotija[Math.floor(Math.random() * tiposBotija.length)], // Placeholder item, ideally from message
              quantidade: Math.floor(Math.random() * 3) + 1,
              preco: 9500,
            },
          ],
          valor: (Math.floor(Math.random() * 3) + 1) * 9500, // Placeholder value, ideally from message
          status: "pendente",
          horario: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          metodoPagamento: ["dinheiro", "transferencia", "multicaixa"][
            Math.floor(Math.random() * 3)
          ] as Order["metodoPagamento"], // Placeholder payment method, ideally from message
          createdAt: new Date(), // Ideally from message
          updatedAt: new Date(), // Ideally from message
        }

        setAllOrders((prev) => [newOrder, ...prev])

        toast({
          title: "Novo Pedido via WebSocket!",
          description: `Pedido #${newOrder.id} de ${newOrder.cliente}`,
        })

        showNotification("TalaGás - Novo Pedido!", {
          body: `Pedido #${newOrder.id} de ${newOrder.cliente}`,
          tag: `order-${newOrder.id}`,
        })
      } else if (lastMessage.type === "order_status_changed" && lastMessage.data) {
        setAllOrders((prev) =>
          prev.map((order) =>
            order.id === lastMessage.data.orderId
              ? { ...order, status: lastMessage.data.status, updatedAt: new Date() }
              : order,
          ),
        )

        toast({
          title: "Status Atualizado",
          description: `Pedido #${lastMessage.data.orderId} - ${lastMessage.data.status}`,
        })
      }
    }
  }, [lastMessage, toast])

  // Simulate real-time orders (fallback when WebSocket is not connected)
  useEffect(() => {
    if (isConnected) {
      // WebSocket is handling real-time updates
      return
    }

    const interval = setInterval(() => {
      if (Math.random() < 0.2) {
        const newOrder: Order = {
          id: (Date.now() % 10000).toString(),
          cliente: ["Carlos Lima", "Paula Oliveira", "Roberto Alves", "Fernanda Costa"][Math.floor(Math.random() * 4)],
          endereco: `Rua ${Math.floor(Math.random() * 999)}, ${Math.floor(Math.random() * 999)}`,
          bairro: bairros[Math.floor(Math.random() * bairros.length)],
          telefone: `+244 9${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`,
          itens: [
            {
              tipo: tiposBotija[Math.floor(Math.random() * tiposBotija.length)],
              quantidade: Math.floor(Math.random() * 3) + 1,
              preco: 9500,
            },
          ],
          valor: (Math.floor(Math.random() * 3) + 1) * 9500,
          status: "pendente",
          horario: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          metodoPagamento: ["dinheiro", "transferencia", "multicaixa"][
            Math.floor(Math.random() * 3)
          ] as Order["metodoPagamento"],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        setAllOrders((prev) => [newOrder, ...prev])

        toast({
          title: "Novo Pedido!",
          description: `Pedido #${newOrder.id} de ${newOrder.cliente}`,
        })

        showNotification("TalaGás - Novo Pedido!", {
          body: `Pedido #${newOrder.id} de ${newOrder.cliente}`,
          tag: `order-${newOrder.id}`,
        })
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [toast, isConnected])

  const filteredAndSortedOrders = useMemo(() => {
    const filtered = allOrders.filter((order) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          order.id.includes(query) ||
          order.cliente.toLowerCase().includes(query) ||
          order.telefone.includes(query) ||
          order.bairro.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Status filter
      if (filterStatus !== "all" && order.status !== filterStatus) return false

      // Bairro filter
      if (filterBairro !== "all" && order.bairro !== filterBairro) return false

      // Entregador filter
      if (filterEntregador !== "all" && order.entregador !== filterEntregador) return false

      // Tipo botija filter
      if (filterTipoBotija !== "all") {
        const hasTipo = order.itens.some((item) => item.tipo === filterTipoBotija)
        if (!hasTipo) return false
      }

      // Metodo pagamento filter
      if (filterMetodoPagamento !== "all" && order.metodoPagamento !== filterMetodoPagamento) return false

      // Price range filter
      if (filterPriceMin && order.valor < Number.parseFloat(filterPriceMin)) return false
      if (filterPriceMax && order.valor > Number.parseFloat(filterPriceMax)) return false

      // Date range filter
      if (filterDateStart) {
        const startDate = new Date(filterDateStart)
        if (order.createdAt < startDate) return false
      }
      if (filterDateEnd) {
        const endDate = new Date(filterDateEnd)
        endDate.setHours(23, 59, 59, 999)
        if (order.createdAt > endDate) return false
      }

      return true
    })

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "createdAt":
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case "valor":
          comparison = a.valor - b.valor
          break
        case "tempoEntrega":
          comparison = (a.tempoEntrega || 0) - (b.tempoEntrega || 0)
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [
    allOrders,
    searchQuery,
    filterStatus,
    filterBairro,
    filterEntregador,
    filterTipoBotija,
    filterMetodoPagamento,
    filterPriceMin,
    filterPriceMax,
    filterDateStart,
    filterDateEnd,
    sortBy,
    sortOrder,
  ])

  const totalPages = Math.ceil(filteredAndSortedOrders.length / pageSize)
  const paginatedOrders = filteredAndSortedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery,
    filterStatus,
    filterBairro,
    filterEntregador,
    filterTipoBotija,
    filterMetodoPagamento,
    filterPriceMin,
    filterPriceMax,
    filterDateStart,
    filterDateEnd,
    pageSize,
  ])

  const handleAcceptOrder = (orderId: string) => {
    setAllOrders(
      allOrders.map((order) => (order.id === orderId ? { ...order, status: "aceito", updatedAt: new Date() } : order)),
    )

    sendMessage({
      type: "order_status_changed",
      data: { orderId, status: "aceito" },
    })

    toast({
      title: "Pedido aceito",
      description: `Pedido #${orderId} foi aceito com sucesso.`,
    })
  }

  const handleForwardOrder = () => {
    if (selectedOrder && selectedDeliveryPerson) {
      setAllOrders(
        allOrders.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, status: "em_entrega", entregador: selectedDeliveryPerson, updatedAt: new Date() }
            : order,
        ),
      )

      sendMessage({
        type: "order_status_changed",
        data: { orderId: selectedOrder.id, status: "em_entrega", entregador: selectedDeliveryPerson },
      })

      toast({
        title: "Pedido encaminhado",
        description: `Pedido #${selectedOrder.id} encaminhado para ${selectedDeliveryPerson}`,
      })
      setIsForwardDialogOpen(false)
      setSelectedOrder(null)
      setSelectedDeliveryPerson("")
    }
  }

  const handleCompleteOrder = (orderId: string) => {
    setAllOrders(
      allOrders.map((order) =>
        order.id === orderId
          ? { ...order, status: "entregue", updatedAt: new Date(), tempoEntrega: Math.floor(Math.random() * 60) + 15 }
          : order,
      ),
    )

    sendMessage({
      type: "order_status_changed",
      data: { orderId, status: "entregue" },
    })

    toast({
      title: "Entrega concluída",
      description: `Pedido #${orderId} foi marcado como entregue.`,
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(paginatedOrders.map((o) => o.id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders)
    if (checked) {
      newSelected.add(orderId)
    } else {
      newSelected.delete(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const handleBulkAction = (action: "aceitar" | "cancelar" | "exportar") => {
    if (selectedOrders.size === 0) {
      toast({
        title: "Nenhum pedido selecionado",
        description: "Selecione pelo menos um pedido para realizar esta ação.",
        variant: "destructive",
      })
      return
    }

    switch (action) {
      case "aceitar":
        setAllOrders(
          allOrders.map((order) =>
            selectedOrders.has(order.id) && order.status === "pendente"
              ? { ...order, status: "aceito", updatedAt: new Date() }
              : order,
          ),
        )
        // Send WebSocket messages for bulk acceptance
        selectedOrders.forEach((orderId) => {
          sendMessage({
            type: "order_status_changed",
            data: { orderId, status: "aceito" },
          })
        })
        toast({
          title: "Pedidos aceitos",
          description: `${selectedOrders.size} pedido(s) aceito(s) com sucesso.`,
        })
        setSelectedOrders(new Set())
        break
      case "cancelar":
        setAllOrders(
          allOrders.map((order) =>
            selectedOrders.has(order.id) ? { ...order, status: "cancelado", updatedAt: new Date() } : order,
          ),
        )
        // Send WebSocket messages for bulk cancellation
        selectedOrders.forEach((orderId) => {
          sendMessage({
            type: "order_status_changed",
            data: { orderId, status: "cancelado" },
          })
        })
        toast({
          title: "Pedidos cancelados",
          description: `${selectedOrders.size} pedido(s) cancelado(s).`,
        })
        setSelectedOrders(new Set())
        break
      case "exportar":
        handleExportCSV()
        break
    }
  }

  const handleExportCSV = () => {
    const ordersToExport =
      selectedOrders.size > 0
        ? filteredAndSortedOrders.filter((o) => selectedOrders.has(o.id))
        : filteredAndSortedOrders

    const headers = ["ID", "Cliente", "Telefone", "Bairro", "Valor", "Status", "Método Pagamento", "Data", "Entregador"]
    const rows = ordersToExport.map((order) => [
      order.id,
      order.cliente,
      order.telefone,
      order.bairro,
      order.valor.toString(),
      order.status,
      order.metodoPagamento,
      order.createdAt.toLocaleDateString("pt-AO"),
      order.entregador || "-",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pedidos-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Exportação concluída",
      description: `${ordersToExport.length} pedido(s) exportado(s) para CSV.`,
    })
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setFilterStatus("all")
    setFilterBairro("all")
    setFilterEntregador("all")
    setFilterTipoBotija("all")
    setFilterMetodoPagamento("all")
    setFilterPriceMin("")
    setFilterPriceMax("")
    setFilterDateStart("")
    setFilterDateEnd("")
  }

  const getStatusConfig = (status: Order["status"]) => {
    switch (status) {
      case "pendente":
        return { label: "Pendente", variant: "destructive" as const, icon: "schedule" }
      case "aceito":
        return { label: "Aceito", variant: "default" as const, icon: "check_circle" }
      case "em_entrega":
        return { label: "Em Entrega", variant: "secondary" as const, icon: "local_shipping" }
      case "entregue":
        return { label: "Entregue", variant: "outline" as const, icon: "done_all" }
      case "cancelado":
        return { label: "Cancelado", variant: "outline" as const, icon: "cancel" }
    }
  }

  const getMetodoPagamentoIcon = (metodo: Order["metodoPagamento"]) => {
    switch (metodo) {
      case "dinheiro":
        return "payments"
      case "transferencia":
        return "account_balance"
      case "multicaixa":
        return "credit_card"
    }
  }

  const filterOrders = (status: Order["status"]) => allOrders.filter((o) => o.status === status)
  const pendingOrdersCount = filterOrders("pendente").length

  const OrderCard = ({ order }: { order: Order }) => {
    const statusConfig = getStatusConfig(order.status)
    const isSelected = selectedOrders.has(order.id)

    return (
      <div
        className={cn(
          "flex flex-col gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-md",
          order.status === "pendente" && "border-destructive/50 bg-destructive/5",
          isSelected && "ring-2 ring-primary",
        )}
      >
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
          />

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <MaterialIcon icon={statusConfig.icon} className="text-2xl text-primary" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">Pedido #{order.id}</h3>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              <span className="text-xs text-muted-foreground">{order.horario}</span>
              <Badge variant="outline" className="gap-1">
                <MaterialIcon icon={getMetodoPagamentoIcon(order.metodoPagamento)} className="text-sm" />
                {order.metodoPagamento}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">{order.cliente}</span> - {order.telefone}
              </p>
              <p className="text-muted-foreground">
                {order.endereco}, {order.bairro}
              </p>
              <p className="text-muted-foreground">
                {order.itens.map((item) => `${item.quantidade}x ${item.tipo}`).join(", ")} - {formatAOA(order.valor)}
              </p>
              {order.entregador && (
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MaterialIcon icon="person" className="text-base" />
                  {order.entregador}
                </p>
              )}
              {order.observacoes && (
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MaterialIcon icon="note" className="text-base" />
                  {order.observacoes}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedOrder(order)
                setIsDetailsDialogOpen(true)
              }}
            >
              <MaterialIcon icon="visibility" />
            </Button>
            {order.status === "pendente" && (
              <>
                <Button size="sm" onClick={() => handleAcceptOrder(order.id)}>
                  <MaterialIcon icon="check" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedOrder(order)
                    setIsForwardDialogOpen(true)
                  }}
                >
                  <MaterialIcon icon="send" />
                </Button>
              </>
            )}
            {order.status === "aceito" && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedOrder(order)
                  setIsForwardDialogOpen(true)
                }}
              >
                <MaterialIcon icon="local_shipping" />
              </Button>
            )}
            {order.status === "em_entrega" && (
              <Button size="sm" onClick={() => handleCompleteOrder(order.id)}>
                <MaterialIcon icon="done_all" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Pedidos" />

      <div className="flex-1 space-y-6 p-6">
        <AdvertisingBanner
          title="Entrega Rápida Garantida!"
          description="Nossos entregadores estão prontos para atender você em até 30 minutos."
          variant="compact"
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <div className="relative">
                <MaterialIcon icon="schedule" className="text-destructive" />
                {pendingOrdersCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                    {pendingOrdersCount}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filterOrders("pendente").length}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aceitos</CardTitle>
              <MaterialIcon icon="check_circle" className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filterOrders("aceito").length}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Entrega</CardTitle>
              <MaterialIcon icon="local_shipping" className="text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filterOrders("em_entrega").length}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregues</CardTitle>
              <MaterialIcon icon="done_all" className="text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filterOrders("entregue").length}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <MaterialIcon icon="cancel" className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filterOrders("cancelado").length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Gestão de Pedidos</CardTitle>
                  <CardDescription>
                    {filteredAndSortedOrders.length} pedido(s) encontrado(s)
                    {selectedOrders.size > 0 && ` • ${selectedOrders.size} selecionado(s)`}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <WebSocketStatus />
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                    <MaterialIcon icon="filter_list" className="mr-2" />
                    Filtros
                    {showFilters && <MaterialIcon icon="expand_less" className="ml-2" />}
                    {!showFilters && <MaterialIcon icon="expand_more" className="ml-2" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <MaterialIcon icon="download" className="mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              </div>

              {/* Search and Quick Filters */}
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <MaterialIcon
                    icon="search"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Pesquisar por cliente, telefone, ID ou bairro..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="aceito">Aceitos</SelectItem>
                    <SelectItem value="em_entrega">Em Entrega</SelectItem>
                    <SelectItem value="entregue">Entregues</SelectItem>
                    <SelectItem value="cancelado">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Filtros Avançados</h3>
                    <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                      <MaterialIcon icon="clear" className="mr-2" />
                      Limpar Filtros
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Select value={filterBairro} onValueChange={setFilterBairro}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {bairros.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Entregador</Label>
                      <Select value={filterEntregador} onValueChange={setFilterEntregador}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {deliveryPersons.map((e) => (
                            <SelectItem key={e} value={e}>
                              {e}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Botija</Label>
                      <Select value={filterTipoBotija} onValueChange={setFilterTipoBotija}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {tiposBotija.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Método de Pagamento</Label>
                      <Select value={filterMetodoPagamento} onValueChange={setFilterMetodoPagamento}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="multicaixa">Multicaixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Valor Mínimo (Kz)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filterPriceMin}
                        onChange={(e) => setFilterPriceMin(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Valor Máximo (Kz)</Label>
                      <Input
                        type="number"
                        placeholder="100000"
                        value={filterPriceMax}
                        onChange={(e) => setFilterPriceMax(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Data Início</Label>
                      <Input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Data Fim</Label>
                      <Input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Ordenar Por</Label>
                      <div className="flex gap-2">
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="createdAt">Data</SelectItem>
                            <SelectItem value="valor">Valor</SelectItem>
                            <SelectItem value="tempoEntrega">Tempo Entrega</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        >
                          <MaterialIcon icon={sortOrder === "asc" ? "arrow_upward" : "arrow_downward"} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Actions */}
              {selectedOrders.size > 0 && (
                <div className="flex flex-wrap gap-2 rounded-lg border border-primary bg-primary/5 p-3">
                  <Button size="sm" onClick={() => handleBulkAction("aceitar")}>
                    <MaterialIcon icon="check_circle" className="mr-2" />
                    Aceitar Selecionados
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("cancelar")}>
                    <MaterialIcon icon="cancel" className="mr-2" />
                    Cancelar Selecionados
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("exportar")}>
                    <MaterialIcon icon="download" className="mr-2" />
                    Exportar Selecionados
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedOrders(new Set())}>
                    <MaterialIcon icon="close" className="mr-2" />
                    Limpar Seleção
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {paginatedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MaterialIcon icon="shopping_cart" className="mb-4 text-5xl text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum pedido encontrado</p>
                {(searchQuery || filterStatus !== "all" || showFilters) && (
                  <Button variant="link" onClick={handleClearFilters} className="mt-2">
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <Checkbox
                    checked={paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedOrders.has(o.id))}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Selecionar todos nesta página</span>
                </div>

                <div className="space-y-4">
                  {paginatedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Itens por página:</Label>
                      <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages} • {filteredAndSortedOrders.length} pedido(s) total
                    </p>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <MaterialIcon icon="first_page" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <MaterialIcon icon="chevron_left" className="mr-1" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <MaterialIcon icon="chevron_right" className="ml-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <MaterialIcon icon="last_page" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Forward Dialog */}
        <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encaminhar Pedido</DialogTitle>
              <DialogDescription>Selecione um entregador para este pedido</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium">Pedido #{selectedOrder.id}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.cliente}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.endereco}</p>
                </div>
                <div className="space-y-2">
                  <Label>Entregador</Label>
                  <Select value={selectedDeliveryPerson} onValueChange={setSelectedDeliveryPerson}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um entregador" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryPersons.map((person) => (
                        <SelectItem key={person} value={person}>
                          {person}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsForwardDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleForwardOrder} disabled={!selectedDeliveryPerson}>
                Encaminhar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">ID do Pedido</Label>
                    <p className="font-medium">#{selectedOrder.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={getStatusConfig(selectedOrder.status).variant}>
                        {getStatusConfig(selectedOrder.status).label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{selectedOrder.cliente}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedOrder.telefone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">Endereço</Label>
                    <p className="font-medium">
                      {selectedOrder.endereco}, {selectedOrder.bairro}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Método de Pagamento</Label>
                    <p className="font-medium capitalize">{selectedOrder.metodoPagamento}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Total</Label>
                    <p className="font-medium">{formatAOA(selectedOrder.valor)}</p>
                  </div>
                  {selectedOrder.entregador && (
                    <div>
                      <Label className="text-muted-foreground">Entregador</Label>
                      <p className="font-medium">{selectedOrder.entregador}</p>
                    </div>
                  )}
                  {selectedOrder.tempoEntrega && (
                    <div>
                      <Label className="text-muted-foreground">Tempo de Entrega</Label>
                      <p className="font-medium">{selectedOrder.tempoEntrega} minutos</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Data do Pedido</Label>
                    <p className="font-medium">{selectedOrder.createdAt.toLocaleString("pt-AO")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Última Atualização</Label>
                    <p className="font-medium">{selectedOrder.updatedAt.toLocaleString("pt-AO")}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Itens do Pedido</Label>
                  <div className="mt-2 space-y-2">
                    {selectedOrder.itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between rounded-lg border p-3">
                        <span>
                          {item.quantidade}x {item.tipo}
                        </span>
                        <span className="font-medium">{formatAOA(item.quantidade * item.preco)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.observacoes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="mt-1 rounded-lg border p-3">{selectedOrder.observacoes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsDetailsDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
