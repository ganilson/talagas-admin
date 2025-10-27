"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { formatCurrency } from "@/lib/currency"
import { AdvertisingBanner } from "@/components/advertising-banner"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Mock data
const dailyOrders = [
  { day: "Seg", pedidos: 45, entregas: 42 },
  { day: "Ter", pedidos: 52, entregas: 50 },
  { day: "Qua", pedidos: 48, entregas: 46 },
  { day: "Qui", pedidos: 61, entregas: 58 },
  { day: "Sex", pedidos: 55, entregas: 53 },
  { day: "Sáb", pedidos: 67, entregas: 65 },
  { day: "Dom", pedidos: 43, entregas: 41 },
]
 
const revenueData = [
  { month: "Jan", valor: 1250000 },
  { month: "Fev", valor: 1420000 },
  { month: "Mar", valor: 1380000 },
  { month: "Abr", valor: 1560000 },
  { month: "Mai", valor: 1690000 },
  { month: "Jun", valor: 1820000 },
]

const productData = [
  { name: "Botijão 13kg", vendas: 245, cor: "hsl(var(--chart-1))" },
  { name: "Botijão 6kg", vendas: 132, cor: "hsl(var(--chart-2))" },
  { name: "Botijão 20kg", vendas: 87, cor: "hsl(var(--chart-3))" },
  { name: "Botijão 45kg", vendas: 43, cor: "hsl(var(--chart-4))" },
]

export default function DashboardPage() {
  const [activeChart, setActiveChart] = useState<"orders" | "revenue">("orders")

  return (
    <div className="flex flex-col">
      <AppHeader title="Dashboard" />

      <div className="flex-1 space-y-6 p-6">
        {/* Advertising Banner */}
        <AdvertisingBanner
          title="Seja bem vindo ao seu Sistema De Gestão de Pedidos!"
          description="Receba seus pedidos em tempo real, faça a distribuição de forma fácil e segura!."
          imageUrl="/gas-cylinder-promotion.jpg"
          ctaText="Ver Detalhes"
          ctaLink="#"
        />

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
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+12% em relação a ontem</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregas Concluídas</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <MaterialIcon icon="check_circle" className="text-chart-2" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">21</div>
              <p className="text-xs text-muted-foreground">3 em andamento</p>
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
              <div className="text-2xl font-bold">{formatCurrency(284700)}</div>
              <p className="text-xs text-muted-foreground">+8% em relação a ontem</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
                <MaterialIcon icon="schedule" className="text-chart-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">28 min</div>
              <p className="text-xs text-muted-foreground">Tempo de entrega</p>
            </CardContent>
          </Card>
        </div>

        {/* Product Performance */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Distribuição de vendas por tipo de botijão</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                vendas: {
                  label: "Vendas",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="vendas" radius={[0, 4, 4, 0]}>
                    {productData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas movimentações do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  icon: "check_circle",
                  color: "text-chart-2",
                  title: "Entrega concluída",
                  description: "Pedido #1247 entregue em Vila Nova",
                  time: "2 min atrás",
                },
                {
                  icon: "local_shipping",
                  color: "text-primary",
                  title: "Saiu para entrega",
                  description: "Pedido #1248 - Entregador: João Silva",
                  time: "8 min atrás",
                },
                {
                  icon: "shopping_cart",
                  color: "text-chart-4",
                  title: "Novo pedido",
                  description: "Pedido #1249 - 2x Botijão 13kg",
                  time: "15 min atrás",
                },
                {
                  icon: "inventory",
                  color: "text-chart-5",
                  title: "Alerta de estoque",
                  description: "Botijão 13kg abaixo do mínimo",
                  time: "1 hora atrás",
                },
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <MaterialIcon icon={activity.icon} className={activity.color} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">{activity.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
