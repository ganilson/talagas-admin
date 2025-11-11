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
import * as pedidoService from "@/services/pedidoService"
import { initSocket } from "@/lib/socket"
import { getStoredUser } from "@/lib/auth"

interface Order {
  id: string
  cliente: string
  endereco: string
  bairro: string
  telefone: string
  itens: { tipo: string; quantidade: number; preco: number }[]
  valor: number
  status: "pendente" | "confirmado" | "entregue" | "cancelado"
  horario: string
  entregador?: string
  metodoPagamento: "dinheiro" | "transferencia" | "multicaixa"
  createdAt: Date
  updatedAt: Date
  tempoEntrega?: number
  observacoes?: string
  codigoPedido?: string
}

const deliveryPersons = ["João Silva", "Pedro Costa", "Ana Souza", "Carlos Mendes"]
const bairros = ["Centro", "Vila Nova", "Jardim América", "Bela Vista", "Talatona", "Morro Bento", "Viana"]
const tiposBotija = ["Botijão 13kg", "Botijão 6kg", "Botijão 45kg"]

export default function PedidosPage() {
  const { toast } = useToast()

  // server-driven pedidos + pagination
  const [pedidos, setPedidos] = useState<pedidoService.Pedido[]>([])
  const [pedidosPagination, setPedidosPagination] = useState<pedidoService.PaginationInfo | null>(null)
  const [pedidoFilters, setPedidoFilters] = useState<{ page: number; limit: number; status?: string; codigoPedido?: string }>({
    page: 1,
    limit: 20,
    status: undefined,
    codigoPedido: "",
  })

  // UI state (selection, dialogs, etc.)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState("")
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // local UI filters (some kept for client-side, but server fetch uses status/codigoPedido/page/limit)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | Order["status"]>("all")
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [codigoPedidoInput, setCodigoPedidoInput] = useState("")

  // map backend Pedido -> UI Order
  const mapBackendToOrder = (p: pedidoService.Pedido): Order => {
    const pa = p.pontoDeAtendimento
    const itens =
      p.produtos?.map((it) => {
        const pe = it.produtoEmpresaId
        const tipo =
          typeof (pe as any).produtoId === "object" ? ((pe as any).produtoId?.descricao || "Produto") : String((pe as any).produtoId)
        const preco = (pe as any).preco ?? 0
        return { tipo, quantidade: it.quantidade ?? 1, preco }
      }) ?? []

    const created = p.createdAt ? new Date(p.createdAt) : new Date()
    return {
      id: p.codigoPedido ?? p._id,
      codigoPedido: p.codigoPedido,
      cliente: p.nomeCompleto ?? "-",
      endereco: pa?.endereco ?? pa?.descricao ?? "-",
      bairro: "-", // backend doesn't provide bairro explicitly in sample
      telefone: p?.telefone ?? "-",
      itens,
      valor: p.total ?? 0,
      status: (p.status as any) ?? "pendente",
      horario: created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      metodoPagamento: (p.metodoPagamento as any) ?? "dinheiro",
      createdAt: created,
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : created,
      observacoes: undefined,
      codigoPedido: p.codigoPedido,
    }
  }

  const loadPedidos = async (filters?: Partial<typeof pedidoFilters>) => {
    const f = { ...pedidoFilters, ...(filters || {}) }
    try {
      const { items, pagination } = await pedidoService.filterPedidos({
        page: f.page,
        limit: f.limit,
        status: f.status,
        codigoPedido: f.codigoPedido,
      })
      setPedidos(items)
      setPedidosPagination(pagination)
      // synchronize UI pagination controls
      setCurrentPage(pagination?.page ?? f.page)
      setPageSize(pagination?.limit ?? f.limit)
      setPedidoFilters(f)
    } catch (err: any) {
      console.error("Erro ao carregar pedidos:", err)
      toast({ title: "Erro ao carregar pedidos", description: err?.message ?? String(err), variant: "destructive" })
    }
  }

  // initial load / refetch when filters change (page/limit/status/codigoPedido)
  useEffect(() => {
    loadPedidos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoFilters.page, pedidoFilters.limit, pedidoFilters.status, pedidoFilters.codigoPedido])

  // socket: conectar para receber novos pedidos/atualizações
  useEffect(() => {
    const user = getStoredUser()
    const estabId = user?.estabelecimentoId
    if (!estabId) return

    const cleanup = initSocket(estabId, {
      onNovoPedido: (payload) => {
        toast({ title: "Novo pedido", description: `Pedido: ${payload?.data?.codigoPedido ?? "novo"}` })
        // refetch page
        loadPedidos()
        if (isNotificationSupported()) {
          showNotification("TalaGás - Novo Pedido", { body: `Pedido: ${payload?.data?.codigoPedido ?? ""}` })
        }
      },
      onPedidoAtualizado: (payload) => {
        toast({ title: "Pedido atualizado", description: `Pedido: ${payload?.data?.codigoPedido ?? "atualizado"}` })
        loadPedidos()
      },
    })

    return () => {
      try { cleanup?.() } catch (e) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Map server pedidos to UI orders for rendering
  const ordersForRender: Order[] = pedidos.map(mapBackendToOrder)

  const totalPages = Math.max(1, pedidosPagination ? pedidosPagination.pages : 1)
  const totalItems = pedidosPagination?.total ?? pedidos.length

  // selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(ordersForRender.map((o) => o.id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders)
    if (checked) newSelected.add(orderId)
    else newSelected.delete(orderId)
    setSelectedOrders(newSelected)
  }

  // Atualizar status com PUT no backend (atualização otimista)
  const handleUpdateOrderStatus = async (pedidoId: string, newStatus: "pendente" | "confirmado" | "entregue" | "cancelado") => {
    const prev = pedidos
    // otimista: atualizar no estado
    setPedidos((cur) => cur.map((p) => (p._id === pedidoId ? { ...p, status: newStatus } : p)))
    try {
      await pedidoService.updatePedidoStatus(pedidoId, { status: newStatus })
      toast({ title: "Status atualizado", description: `Pedido atualizado para ${newStatus}.` })
    } catch (err: any) {
      // rollback
      setPedidos(prev)
      toast({ title: "Erro ao atualizar status", description: err?.message ?? String(err), variant: "destructive" })
      console.error("Erro ao atualizar status:", err)
    }
  }

  const handleAcceptOrder = (orderId: string) => {
    // encontrar o _id do pedido no array
    const pedido = pedidos.find((p) => p.codigoPedido === orderId)
    if (!pedido) return
    handleUpdateOrderStatus(pedido._id, "confirmado")
  }

  const handleForwardOrder = () => {
    if (!selectedOrder || !selectedDeliveryPerson) return
    const pedido = pedidos.find((p) => p.codigoPedido === selectedOrder.codigoPedido)
    if (!pedido) return
    // nota: o status aqui pode ser "entregue" ou um status intermediário; ajuste conforme seu modelo
    // por agora, vamos apenas confirmar que foi encaminhado (que já foi confirmado)
    // se quiser um status separado "em_entrega", adicione ao backend
    toast({ title: "Pedido encaminhado", description: `Pedido #${selectedOrder.codigoPedido} encaminhado para ${selectedDeliveryPerson}.` })
    setIsForwardDialogOpen(false)
    setSelectedOrder(null)
  }

  const handleCompleteOrder = (orderId: string) => {
    const pedido = pedidos.find((p) => p.codigoPedido === orderId)
    if (!pedido) return
    handleUpdateOrderStatus(pedido._id, "entregue")
  }

  const handleExportCSV = () => {
    const rows = ordersForRender.map((order) => [
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
    const headers = ["ID", "Cliente", "Telefone", "Bairro", "Valor", "Status", "Método Pagamento", "Data", "Entregador"]
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pedidos-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exportação concluída", description: `${rows.length} pedido(s) exportado(s)` })
  }

  const getStatusConfig = (status: Order["status"]) => {
    switch (status) {
      case "pendente":
        return { label: "Pendente", variant: "destructive" as const, icon: "schedule" }
      case "confirmado":
        return { label: "Aceito", variant: "default" as const, icon: "check_circle" }
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

  // OrderCard component
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
          <Checkbox checked={isSelected} onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)} />
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
            <Button size="sm" variant="ghost" onClick={() => { setSelectedOrder(order); setIsDetailsDialogOpen(true) }}>
              <MaterialIcon icon="visibility" />
            </Button>
            {order.status === "pendente" && (
              <>
                <Button size="sm" onClick={() => handleAcceptOrder(order.id)}><MaterialIcon icon="check" /></Button>
                <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setIsForwardDialogOpen(true) }}>
                  <MaterialIcon icon="send" />
                </Button>
              </>
            )}
            {order.status === "confirmado" && (
              <Button size="sm" onClick={() => { setSelectedOrder(order); setIsForwardDialogOpen(true) }}><MaterialIcon icon="local_shipping" /></Button>
            )}
            {order.status === "confirmado" && (
              <Button size="sm" onClick={() => handleCompleteOrder(order.id)}><MaterialIcon icon="done_all" /></Button>
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
        {/* Stats: counts calculated from current 'pedidos' page (for global counts you'd fetch a dashboard endpoint) */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <div className="relative">
                <MaterialIcon icon="schedule" className="text-destructive" />
                {pedidos.filter((p) => p.status === "pendente").length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                    {pedidos.filter((p) => p.status === "pendente").length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pedidos.filter((p) => p.status === "pendente").length}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
              <MaterialIcon icon="check_circle" className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pedidos.filter((p) => p.status === "confirmado").length}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregues</CardTitle>
              <MaterialIcon icon="done_all" className="text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pedidos.filter((p) => p.status === "entregue").length}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <MaterialIcon icon="cancel" className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pedidos.filter((p) => p.status === "cancelado").length}</div>
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
                  <CardDescription>{totalItems} pedido(s) encontrado(s) • Página {pedidoFilters.page} / {pedidosPagination?.pages ?? 1}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                    <MaterialIcon icon="filter_list" className="mr-2" />
                    Filtros
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <MaterialIcon icon="download" className="mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <MaterialIcon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Pesquisar (não aplicado no servidor)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>

                {/* Código do Pedido - usado no endpoint */}
                <Input placeholder="Código do Pedido" value={codigoPedidoInput} onChange={(e) => setCodigoPedidoInput(e.target.value)} className="md:w-[200px]" />
                <Button size="sm" onClick={() => setPedidoFilters((f) => ({ ...f, page: 1, codigoPedido: codigoPedidoInput || undefined }))}>Buscar</Button>

                <Select value={filterStatus} onValueChange={(value: any) => { setFilterStatus(value); setPedidoFilters((f) => ({ ...f, page: 1, status: value === "all" ? undefined : value })) }}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="confirmado">Confirmados</SelectItem>
                    <SelectItem value="entregue">Entregues</SelectItem>
                    <SelectItem value="cancelado">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
            {ordersForRender.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MaterialIcon icon="shopping_cart" className="mb-4 text-5xl text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum pedido encontrado</p>
                <Button variant="link" onClick={() => { setPedidoFilters({ page:1, limit: pedidoFilters.limit }); setCodigoPedidoInput(""); }}>Recarregar</Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <Checkbox checked={ordersForRender.length > 0 && ordersForRender.every((o) => selectedOrders.has(o.id))} onCheckedChange={handleSelectAll} />
                  <span className="text-sm text-muted-foreground">Selecionar todos nesta página</span>
                </div>

                <div className="space-y-4">
                  {ordersForRender.map((order) => <OrderCard key={order.id} order={order} />)}
                </div>

                {/* Pagination (server-driven) */}
                { (pedidosPagination?.pages ?? 1) > 1 && (
                  <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Itens por página:</Label>
                      <Select value={String(pedidoFilters.limit)} onValueChange={(value) => setPedidoFilters((f) => ({ ...f, limit: Number(value), page: 1 }))}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Página {pedidoFilters.page} de {pedidosPagination?.pages ?? 1} • {pedidosPagination?.total ?? pedidos.length} pedido(s) total
                    </p>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPedidoFilters((f) => ({ ...f, page: 1 }))} disabled={pedidoFilters.page === 1}><MaterialIcon icon="first_page" /></Button>
                      <Button variant="outline" size="sm" onClick={() => setPedidoFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={pedidoFilters.page === 1}><MaterialIcon icon="chevron_left" className="mr-1" />Anterior</Button>
                      <Button variant="outline" size="sm" onClick={() => setPedidoFilters((f) => ({ ...f, page: Math.min((pedidosPagination?.pages ?? 1), f.page + 1) }))} disabled={pedidoFilters.page === (pedidosPagination?.pages ?? 1)}>Próxima<MaterialIcon icon="chevron_right" className="ml-1" /></Button>
                      <Button variant="outline" size="sm" onClick={() => setPedidoFilters((f) => ({ ...f, page: pedidosPagination?.pages ?? f.page }))} disabled={pedidoFilters.page === (pedidosPagination?.pages ?? 1)}><MaterialIcon icon="last_page" /></Button>
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
