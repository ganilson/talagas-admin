"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { formatCurrency } from "@/lib/currency"
import { AdvertisingBanner } from "@/components/advertising-banner"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
 
export default function DashboardPage() {
  // KPIs
  const [kpis, setKpis] = useState<any>(null)
  const [showValor, setShowValor] = useState(false)
  // Gráficos
  const [grafico, setGrafico] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiFetch<any>("/empresas/dashboard/kpis?hoje=true"),
      apiFetch<any>("/empresas/dashboard/pedidos-grafico?hoje=true"),
    ])
      .then(([kpiRes, graficoRes]) => {
        setKpis(kpiRes.data)
        setGrafico(graficoRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Gráfico de status
  const statusChartData =
    grafico?.porStatus?.map((s: any) => ({
      status:
        s._id === "pendente"
          ? "Pendentes"
          : s._id === "confirmado"
          ? "Confirmados"
          : s._id === "entregue"
          ? "Entregues"
          : s._id === "cancelado"
          ? "Cancelados"
          : s._id,
      total: s.total,
    })) ?? []

  // Gráfico de pedidos por mês
  const pedidosPorMes =
    grafico?.porMes?.map((m: any) => ({
      mes: `${String(m._id.mes).padStart(2, "0")}/${m._id.ano}`,
      total: m.total,
    })) ?? []

  return (
    <div className="flex flex-col">
      <AppHeader title="Dashboard" />

      <div className="flex-1 space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MaterialIcon icon="shopping_cart" className="text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis?.totalPedidos ?? <span className="opacity-50">--</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                Pendentes: {kpis?.pedidosPendentes ?? "--"}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregues</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <MaterialIcon icon="check_circle" className="text-chart-2" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis?.pedidosEntregues ?? <span className="opacity-50">--</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                Cancelados: {kpis?.pedidosCancelados ?? "--"}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Hoje</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
                <MaterialIcon icon="payments" className="text-chart-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {showValor
                    ? formatCurrency(kpis?.totalValorPedidos ?? 0)
                    : "••••••"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setShowValor((v) => !v)}
                  title={showValor ? "Ocultar valor" : "Mostrar valor"}
                >
                  <MaterialIcon icon={showValor ? "visibility_off" : "visibility"} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique no olho para visualizar
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transportadores</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
                <MaterialIcon icon="local_shipping" className="text-chart-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis?.totalTransportadores ?? <span className="opacity-50">--</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                Estabelecimentos: {kpis?.totalEstabelecimentos ?? "--"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de pedidos por status */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle>Pedidos por Status</CardTitle>
            <CardDescription>Distribuição dos pedidos do dia por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Pedidos",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pedidos por mês */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle>Pedidos por Mês</CardTitle>
            <CardDescription>Volume de pedidos por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Pedidos",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pedidosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {pedidosPorMes.map((entry, index) => (
                      <Cell key={`cell-mes-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
