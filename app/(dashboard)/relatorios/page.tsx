"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { exportToPDF } from "@/lib/pdf-export"
import { useToast } from "@/hooks/use-toast"

interface CompletedOrder {
  id: string
  cliente: string
  bairro: string
  entregador: string
  valor: number
  data: string
  tempoEntrega: number
}

export default function RelatoriosPage() {
  const { toast } = useToast()
  const [filterDate, setFilterDate] = useState("")
  const [filterBairro, setFilterBairro] = useState("todos")
  const [filterEntregador, setFilterEntregador] = useState("todos")

  const completedOrders: CompletedOrder[] = [
    {
      id: "1245",
      cliente: "Maria Silva",
      bairro: "Centro",
      entregador: "João Silva",
      valor: 19000,
      data: "2025-02-10",
      tempoEntrega: 25,
    },
    {
      id: "1244",
      cliente: "Carlos Santos",
      bairro: "Vila Nova",
      entregador: "Pedro Costa",
      valor: 9500,
      data: "2025-02-10",
      tempoEntrega: 32,
    },
    {
      id: "1243",
      cliente: "Ana Costa",
      bairro: "Jardim América",
      entregador: "João Silva",
      valor: 16000,
      data: "2025-02-10",
      tempoEntrega: 28,
    },
    {
      id: "1242",
      cliente: "Roberto Lima",
      bairro: "Centro",
      entregador: "Ana Souza",
      valor: 28500,
      data: "2025-02-09",
      tempoEntrega: 22,
    },
    {
      id: "1241",
      cliente: "Paula Oliveira",
      bairro: "Bela Vista",
      entregador: "Carlos Mendes",
      valor: 9500,
      data: "2025-02-09",
      tempoEntrega: 35,
    },
    {
      id: "1240",
      cliente: "Fernando Alves",
      bairro: "Vila Nova",
      entregador: "João Silva",
      valor: 19000,
      data: "2025-02-09",
      tempoEntrega: 27,
    },
    {
      id: "1239",
      cliente: "Juliana Mendes",
      bairro: "Centro",
      entregador: "Pedro Costa",
      valor: 9500,
      data: "2025-02-08",
      tempoEntrega: 30,
    },
    {
      id: "1238",
      cliente: "Ricardo Costa",
      bairro: "Jardim América",
      entregador: "Ana Souza",
      valor: 38000,
      data: "2025-02-08",
      tempoEntrega: 40,
    },
  ]

  const bairros = ["todos", ...Array.from(new Set(completedOrders.map((o) => o.bairro)))]
  const entregadores = ["todos", ...Array.from(new Set(completedOrders.map((o) => o.entregador)))]

  const filteredOrders = completedOrders.filter((order) => {
    if (filterDate && order.data !== filterDate) return false
    if (filterBairro !== "todos" && order.bairro !== filterBairro) return false
    if (filterEntregador !== "todos" && order.entregador !== filterEntregador) return false
    return true
  })

  const totalRevenue = filteredOrders.reduce((acc, order) => acc + order.valor, 0)
  const avgDeliveryTime =
    filteredOrders.length > 0
      ? Math.round(filteredOrders.reduce((acc, order) => acc + order.tempoEntrega, 0) / filteredOrders.length)
      : 0

  // Top customers
  const customerFrequency = filteredOrders.reduce(
    (acc, order) => {
      acc[order.cliente] = (acc[order.cliente] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const topCustomers = Object.entries(customerFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Deliveries by neighborhood
  const neighborhoodStats = filteredOrders.reduce(
    (acc, order) => {
      acc[order.bairro] = (acc[order.bairro] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Deliveries by person
  const deliveryPersonStats = filteredOrders.reduce(
    (acc, order) => {
      if (!acc[order.entregador]) {
        acc[order.entregador] = { count: 0, totalTime: 0 }
      }
      acc[order.entregador].count++
      acc[order.entregador].totalTime += order.tempoEntrega
      return acc
    },
    {} as Record<string, { count: number; totalTime: number }>,
  )

  const handleExportPDF = async () => {
    try {
      await exportToPDF("relatorio-content", `relatorio-talagas-${new Date().toISOString().split("T")[0]}.pdf`)
      toast({
        title: "Relatório exportado!",
        description: "O PDF foi baixado com sucesso.",
      })
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Relatórios" />

      <div className="flex-1 space-y-6 p-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre os relatórios por data, bairro ou entregador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Select value={filterBairro} onValueChange={setFilterBairro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bairros.map((bairro) => (
                      <SelectItem key={bairro} value={bairro}>
                        {bairro === "todos" ? "Todos os bairros" : bairro}
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
                    {entregadores.map((entregador) => (
                      <SelectItem key={entregador} value={entregador}>
                        {entregador === "todos" ? "Todos os entregadores" : entregador}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterDate("")
                  setFilterBairro("todos")
                  setFilterEntregador("todos")
                }}
              >
                <MaterialIcon icon="refresh" className="mr-2" />
                Limpar Filtros
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <MaterialIcon icon="download" className="mr-2" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <div id="relatorio-content" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
                <MaterialIcon icon="done_all" className="text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredOrders.length}</div>
                <p className="text-xs text-muted-foreground">No período selecionado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                <MaterialIcon icon="payments" className="text-chart-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Receita do período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <MaterialIcon icon="schedule" className="text-chart-5" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgDeliveryTime} min</div>
                <p className="text-xs text-muted-foreground">Tempo de entrega</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Clientes Mais Ativos</CardTitle>
                <CardDescription>Clientes com mais pedidos no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCustomers.length > 0 ? (
                    topCustomers.map(([cliente, count], index) => (
                      <div key={cliente} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {index + 1}
                          </div>
                          <span className="font-medium">{cliente}</span>
                        </div>
                        <Badge variant="secondary">{count} pedidos</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">Nenhum dado disponível</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Deliveries by Neighborhood */}
            <Card>
              <CardHeader>
                <CardTitle>Entregas por Bairro</CardTitle>
                <CardDescription>Distribuição de entregas por região</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(neighborhoodStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([bairro, count]) => (
                      <div key={bairro} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MaterialIcon icon="location_on" className="text-primary" />
                          <span className="font-medium">{bairro}</span>
                        </div>
                        <Badge variant="secondary">{count} entregas</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Person Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Desempenho dos Entregadores</CardTitle>
              <CardDescription>Estatísticas de entregas por entregador</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(deliveryPersonStats)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([entregador, stats]) => (
                    <div key={entregador} className="flex items-center gap-4 rounded-lg border border-border p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <MaterialIcon icon="person" className="text-2xl text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{entregador}</h3>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{stats.count} entregas</span>
                          <span>Tempo médio: {Math.round(stats.totalTime / stats.count)} min</span>
                        </div>
                      </div>
                      <Badge variant="secondary">{stats.count} pedidos</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Concluídos</CardTitle>
              <CardDescription>Histórico detalhado de entregas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-2/10">
                        <MaterialIcon icon="check_circle" className="text-chart-2" />
                      </div>
                      <div>
                        <p className="font-medium">
                          Pedido #{order.id} - {order.cliente}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.bairro} • {order.entregador} • {order.tempoEntrega} min
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.valor)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.data).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
