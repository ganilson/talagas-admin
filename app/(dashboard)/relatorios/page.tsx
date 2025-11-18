"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatAOA } from "@/lib/angola-validations"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface DashboardData {
  totalPedidos: number
  pedidosHoje: number
  receita: number
  receitaHoje: number
  ticketMedio: string
  pedidosPorStatus: Array<{
    status: "pendente" | "confirmado" | "entregue" | "cancelado"
    total: number
  }>
}

interface VendaPeriodo {
  _id: string
  total: number
  quantidade: number
  frete: number
}

interface RelatorioVendas {
  success: boolean
  data: VendaPeriodo[]
  resumo: {
    totalVendas: number
    totalPedidos: number
    totalFrete: number
  }
}

interface ProdutoPerformance {
  produtoId: string
  produto: string
  totalVendido: number
  receita: string
  pedidos: number
}

interface RelatorioPerformance {
  success: boolean
  data: ProdutoPerformance[]
}

interface TransportadorData {
  transportadorId: string
  nome: string
  totalEntregas: number
  receita: string
  freteMedio: string
}

interface RelatoriTransportador {
  success: boolean
  data: TransportadorData[]
}

interface PagamentoData {
  metodo: string
  total: string
  quantidade: number
  percentual: string
}

interface RelatorioPagamento {
  success: boolean
  data: PagamentoData[]
}

interface TendenciasData {
  mesAtual: { receita: string; pedidos: number }
  mesAnterior: { receita: string; pedidos: number }
  crescimento: { receita: string; pedidos: string }
}

interface RelatoriTendencias {
  success: boolean
  data: TendenciasData
}

export default function RelatoriosPage() {
  const { toast } = useToast()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [vendaData, setVendaData] = useState<RelatorioVendas | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<"hoje" | "semana" | "7dias" | "ano">("7dias")
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "7dias">("7dias")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [performanceData, setPerformanceData] = useState<ProdutoPerformance[]>([])
  const [transportadorData, setTransportadorData] = useState<TransportadorData[]>([])
  const [pagamentoData, setPagamentoData] = useState<PagamentoData[]>([])
  const [tendenciasData, setTendenciasData] = useState<TendenciasData | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [dateRange])

  useEffect(() => {
    loadVendas()
  }, [periodo])

  useEffect(() => {
    loadPerformanceData()
    loadTransportadorData()
    loadPagamentoData()
    loadTendenciasData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const response = await apiFetch<DashboardData>("/empresas/relatorios/dashboard")
      setDashboardData(response.data)
    } catch (err: any) {
      console.error("Erro ao carregar dashboard:", err)
      toast({
        title: "Erro ao carregar dados",
        description: err?.message ?? "Ocorreu um erro ao buscar os dados do dashboard.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadVendas = async () => {
    try {
      const params = new URLSearchParams()
      params.append("periodo", periodo)
      if (dataInicio) params.append("dataInicio", dataInicio)
      if (dataFim) params.append("dataFim", dataFim)

      const response = await apiFetch<VendaPeriodo[]>(
        `/empresas/relatorios/vendas-periodo?${params.toString()}`
      )
      setVendaData(response as any)
    } catch (err: any) {
      console.error("Erro ao carregar vendas:", err)
      toast({
        title: "Erro ao carregar vendas",
        description: err?.message ?? "Ocorreu um erro ao buscar os dados de vendas.",
        variant: "destructive",
      })
    }
  }

  const loadPerformanceData = async () => {
    try {
      const response = await apiFetch<ProdutoPerformance[]>("/empresas/relatorios/produtos-performance")
      setPerformanceData(response.data)
    } catch (err: any) {
      console.error("Erro ao carregar performance:", err)
    }
  }

  const loadTransportadorData = async () => {
    try {
      const response = await apiFetch<TransportadorData[]>("/empresas/relatorios/transportadores")
      setTransportadorData(response.data)
    } catch (err: any) {
      console.error("Erro ao carregar transportadores:", err)
    }
  }

  const loadPagamentoData = async () => {
    try {
      const response = await apiFetch<PagamentoData[]>("/empresas/relatorios/pagamentos")
      setPagamentoData(response.data)
    } catch (err: any) {
      console.error("Erro ao carregar pagamentos:", err)
    }
  }

  const loadTendenciasData = async () => {
    try {
      const response = await apiFetch<TendenciasData>("/empresas/relatorios/tendencias")
      setTendenciasData(response.data)
    } catch (err: any) {
      console.error("Erro ao carregar tendências:", err)
    }
  }

  const downloadPDF = async (type: "dashboard" | "vendas") => {
    try {
      if (type === "dashboard") {
        generateDashboardPDF()
      } else {
        generateVendasPDF()
      }
      toast({ title: "PDF gerado", description: "O arquivo foi baixado com sucesso." })
    } catch (err: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: err?.message ?? "Não foi possível gerar o PDF.",
        variant: "destructive",
      })
    }
  }

  const downloadExcel = async (type: "dashboard" | "vendas") => {
    try {
      if (type === "dashboard") {
        generateDashboardExcel()
      } else {
        generateVendasExcel()
      }
      toast({ title: "Excel gerado", description: "O arquivo foi baixado com sucesso." })
    } catch (err: any) {
      toast({
        title: "Erro ao gerar Excel",
        description: err?.message ?? "Não foi possível gerar o Excel.",
        variant: "destructive",
      })
    }
  }

  // Função para gerar PDF do Dashboard
  const generateDashboardPDF = () => {
    const { jsPDF } = require("jspdf")
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 20

    // Logo e cabeçalho
    doc.setFontSize(20)
    doc.text("TALAGAS", 20, yPosition)
    doc.setFontSize(10)
    doc.text("Relatório de Dashboard", 20, yPosition + 8)
    doc.line(20, yPosition + 12, pageWidth - 20, yPosition + 12)

    yPosition += 25

    // KPIs
    doc.setFontSize(12)
    doc.text("Principais Indicadores", 20, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.text(`Total de Pedidos: ${dashboardData?.totalPedidos ?? 0}`, 20, yPosition)
    yPosition += 8
    doc.text(`Pedidos Hoje: ${dashboardData?.pedidosHoje ?? 0}`, 20, yPosition)
    yPosition += 8
    doc.text(`Receita Total: Kzs ${dashboardData?.receita?.toLocaleString("pt-AO") ?? 0}`, 20, yPosition)
    yPosition += 8
    doc.text(`Receita Hoje: Kzs ${dashboardData?.receitaHoje?.toLocaleString("pt-AO") ?? 0}`, 20, yPosition)
    yPosition += 8
    doc.text(`Ticket Médio: Kzs ${parseFloat(dashboardData?.ticketMedio ?? "0").toLocaleString("pt-AO")}`, 20, yPosition)

    yPosition += 15

    // Status Distribution
    doc.setFontSize(12)
    doc.text("Distribuição por Status", 20, yPosition)
    yPosition += 10

    doc.setFontSize(9)
    dashboardData?.pedidosPorStatus.forEach((status) => {
      const percentage = ((status.total / (dashboardData?.totalPedidos || 1)) * 100).toFixed(1)
      doc.text(`${status.status}: ${status.total} (${percentage}%)`, 20, yPosition)
      yPosition += 7
    })

    // Rodapé
    doc.setFontSize(8)
    doc.text(
      `Gerado em: ${new Date().toLocaleDateString("pt-AO")} às ${new Date().toLocaleTimeString("pt-AO")}`,
      20,
      pageHeight - 10
    )

    doc.save("dashboard-talagas.pdf")
  }

  // Função para gerar PDF de Vendas
  const generateVendasPDF = () => {
    const { jsPDF } = require("jspdf")
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 20

    // Logo e cabeçalho
    doc.setFontSize(20)
    doc.text("TALAGAS", 20, yPosition)
    doc.setFontSize(10)
    doc.text("Relatório de Vendas por Período", 20, yPosition + 8)
    doc.line(20, yPosition + 12, pageWidth - 20, yPosition + 12)

    yPosition += 25

    // Resumo
    doc.setFontSize(12)
    doc.text("Resumo", 20, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.text(`Total de Vendas: Kzs ${vendaData?.resumo.totalVendas?.toLocaleString("pt-AO") ?? 0}`, 20, yPosition)
    yPosition += 8
    doc.text(`Total de Pedidos: ${vendaData?.resumo.totalPedidos ?? 0}`, 20, yPosition)
    yPosition += 8
    doc.text(`Total de Frete: Kzs ${vendaData?.resumo.totalFrete?.toLocaleString("pt-AO") ?? 0}`, 20, yPosition)

    yPosition += 15

    // Detalhes
    doc.setFontSize(12)
    doc.text("Detalhes por Data", 20, yPosition)
    yPosition += 10

    doc.setFontSize(9)
    vendaData?.data.forEach((venda) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage()
        yPosition = 20
      }
      doc.text(`Data: ${venda._id}`, 20, yPosition)
      yPosition += 6
      doc.text(`  Total: Kzs ${venda.total?.toLocaleString("pt-AO") ?? 0}`, 25, yPosition)
      yPosition += 6
      doc.text(`  Quantidade: ${venda.quantidade}`, 25, yPosition)
      yPosition += 6
      doc.text(`  Frete: Kzs ${venda.frete?.toLocaleString("pt-AO") ?? 0}`, 25, yPosition)
      yPosition += 10
    })

    // Rodapé
    doc.setFontSize(8)
    doc.text(
      `Gerado em: ${new Date().toLocaleDateString("pt-AO")} às ${new Date().toLocaleTimeString("pt-AO")}`,
      20,
      pageHeight - 10
    )

    doc.save("vendas-talagas.pdf")
  }

  // Função para gerar Excel do Dashboard
  const generateDashboardExcel = () => {
    const XLSX = require("xlsx")
    const data = [
      ["TALAGAS - Dashboard"],
      [],
      ["Principais Indicadores"],
      ["Total de Pedidos", dashboardData?.totalPedidos ?? 0],
      ["Pedidos Hoje", dashboardData?.pedidosHoje ?? 0],
      ["Receita Total", dashboardData?.receita ?? 0],
      ["Receita Hoje", dashboardData?.receitaHoje ?? 0],
      ["Ticket Médio", parseFloat(dashboardData?.ticketMedio ?? "0")],
      [],
      ["Distribuição por Status"],
      ["Status", "Total", "Percentual"],
    ]

    dashboardData?.pedidosPorStatus.forEach((status) => {
      const percentage = (
        (status.total / (dashboardData?.totalPedidos || 1)) *
        100
      ).toFixed(1)
      data.push([status.status, status.total, `${percentage}%`])
    })

    data.push([])
    data.push(["Gerado em:", new Date().toLocaleString("pt-AO")])

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws["A1"].font = { bold: true, size: 16 }

    // Estilos
    for (let i = 0; i < data.length; i++) {
      ws[`A${i + 1}`].font = { bold: data[i][0]?.toString().includes("TALAGAS") }
      ws[`A${i + 1}`].fill = data[i][0]?.toString().includes("Indicadores") ? { fgColor: { rgb: "FFCCCC" } } : {}
    }

    ws.columnWidth = [30, 15, 15]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard")
    XLSX.writeFile(wb, "dashboard-talagas.xlsx")
  }

  // Função para gerar Excel de Vendas
  const generateVendasExcel = () => {
    const XLSX = require("xlsx")
    const data = [
      ["TALAGAS - Relatório de Vendas"],
      [],
      ["Resumo"],
      ["Total de Vendas", vendaData?.resumo.totalVendas ?? 0],
      ["Total de Pedidos", vendaData?.resumo.totalPedidos ?? 0],
      ["Total de Frete", vendaData?.resumo.totalFrete ?? 0],
      [],
      ["Detalhes por Data"],
      ["Data", "Total", "Quantidade", "Frete"],
    ]

    vendaData?.data.forEach((venda) => {
      data.push([venda._id, venda.total ?? 0, venda.quantidade, venda.frete ?? 0])
    })

    data.push([])
    data.push(["Gerado em:", new Date().toLocaleString("pt-AO")])

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws["A1"].font = { bold: true, size: 16 }

    ws.columnWidth = [20, 15, 15, 15]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Vendas")
    XLSX.writeFile(wb, "vendas-talagas.xlsx")
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pendente":
        return { label: "Pendentes", icon: "schedule", color: "bg-destructive/10 text-destructive", variant: "destructive" as const }
      case "confirmado":
        return { label: "Confirmados", icon: "check_circle", color: "bg-primary/10 text-primary", variant: "default" as const }
      case "entregue":
        return { label: "Entregues", icon: "done_all", color: "bg-green-100 text-green-700", variant: "outline" as const }
      case "cancelado":
        return { label: "Cancelados", icon: "cancel", color: "bg-gray-100 text-gray-700", variant: "outline" as const }
      default:
        return { label: status, icon: "info", color: "bg-gray-100 text-gray-700", variant: "outline" as const }
    }
  }

  const generatePDFWithBranding = (title: string, content: string) => {
    const { jsPDF } = require("jspdf")
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const primaryColor = [255, 106, 0] // Laranja TALAGÁS
    const darkGray = [26, 26, 26] // Cinza muito escuro
    const lightGray = [244, 244, 244] // Cinza claro

    // Header com branding
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 35, "F")
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text("TALAGÁS", 20, 18)
    
    doc.setFontSize(12)
    doc.text(title, 20, 28)

    // Conteúdo
    doc.setTextColor(...darkGray)
    doc.setFontSize(10)
    let yPosition = 45

    const lines = content.split("\n")
    lines.forEach((line) => {
      if (yPosition > pageHeight - 25) {
        doc.addPage()
        doc.setFillColor(...primaryColor)
        doc.rect(0, 0, pageWidth, 15, "F")
        yPosition = 20
      }
      doc.text(line, 20, yPosition)
      yPosition += 7
    })

    // Rodapé padrão
    const footerY = pageHeight - 10
    doc.setFontSize(7)
    doc.setTextColor(102, 102, 102)
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5)
    doc.text(
      `TALAGÁS · +244 XXX XXX XXX · geral@talagas.ao · talagas.pt`,
      20,
      footerY
    )
    doc.text(
      `Gerado em: ${new Date().toLocaleDateString("pt-AO")} | Página 1`,
      pageWidth - 60,
      footerY
    )

    return doc
  }

  const generateExcelWithBranding = (sheetName: string, data: any[], headers: string[]) => {
    const XLSX = require("xlsx")
    
    // Preparar dados
    const excelData = [
      ["TALAGÁS"],
      [`Relatório de ${sheetName}`],
      [],
      headers,
      ...data,
    ]

    const ws = XLSX.utils.aoa_to_sheet(excelData)

    // Estilos
    ws["A1"].font = { bold: true, size: 16, color: { rgb: "FF6A00" } }
    ws["A2"].font = { bold: true, size: 12 }

    // Congelar primeira linha
    ws["!freeze"] = { xSplit: 0, ySplit: 4 }

    // Largura das colunas
    ws["!cols"] = headers.map(() => ({ wch: 20 }))

    // Header com cor laranja
    for (let i = 0; i < headers.length; i++) {
      const cell = ws[XLSX.utils.encode_col(i) + "4"]
      if (cell) {
        cell.fill = { fgColor: { rgb: "FF6A00" } }
        cell.font = { bold: true, color: { rgb: "FFFFFF" } }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    return wb
  }

  const downloadProdutosPDF = () => {
    let content = "PERFORMANCE DE PRODUTOS\n\n"
    performanceData.forEach((p) => {
      content += `Produto: ${p.produto}\n`
      content += `Total Vendido: ${p.totalVendido} unidades\n`
      content += `Receita: Kzs ${parseFloat(p.receita).toLocaleString("pt-AO")}\n`
      content += `Pedidos: ${p.pedidos}\n\n`
    })
    const doc = generatePDFWithBranding("Relatório de Performance de Produtos", content)
    doc.save("produtos-performance-talagas.pdf")
    toast({ title: "PDF gerado", description: "Relatório de produtos baixado com sucesso." })
  }

  const downloadProdutosExcel = () => {
    const data = performanceData.map((p) => [
      p.produto,
      p.totalVendido,
      parseFloat(p.receita).toLocaleString("pt-AO"),
      p.pedidos,
    ])
    const wb = generateExcelWithBranding(
      "Performance",
      data,
      ["Produto", "Total Vendido", "Receita", "Pedidos"]
    )
    require("xlsx").writeFile(wb, "produtos-performance-talagas.xlsx")
    toast({ title: "Excel gerado", description: "Relatório de produtos baixado com sucesso." })
  }

  const downloadTransportadoresPDF = () => {
    let content = "PERFORMANCE DE TRANSPORTADORES\n\n"
    transportadorData.forEach((t) => {
      content += `Transportador: ${t.nome}\n`
      content += `Total de Entregas: ${t.totalEntregas}\n`
      content += `Receita: Kzs ${parseFloat(t.receita).toLocaleString("pt-AO")}\n`
      content += `Frete Médio: Kzs ${parseFloat(t.freteMedio).toLocaleString("pt-AO")}\n\n`
    })
    const doc = generatePDFWithBranding("Relatório de Transportadores", content)
    doc.save("transportadores-talagas.pdf")
    toast({ title: "PDF gerado", description: "Relatório de transportadores baixado com sucesso." })
  }

  const downloadTransportadoresExcel = () => {
    const data = transportadorData.map((t) => [
      t.nome,
      t.totalEntregas,
      parseFloat(t.receita).toLocaleString("pt-AO"),
      parseFloat(t.freteMedio).toLocaleString("pt-AO"),
    ])
    const wb = generateExcelWithBranding(
      "Transportadores",
      data,
      ["Nome", "Total Entregas", "Receita", "Frete Médio"]
    )
    require("xlsx").writeFile(wb, "transportadores-talagas.xlsx")
    toast({ title: "Excel gerado", description: "Relatório de transportadores baixado com sucesso." })
  }

  const downloadPagamentosPDF = () => {
    let content = "ANÁLISE DE MÉTODOS DE PAGAMENTO\n\n"
    pagamentoData.forEach((p) => {
      content += `Método: ${p.metodo.toUpperCase()}\n`
      content += `Total: Kzs ${parseFloat(p.total).toLocaleString("pt-AO")}\n`
      content += `Quantidade: ${p.quantidade}\n`
      content += `Percentual: ${p.percentual}%\n\n`
    })
    const doc = generatePDFWithBranding("Relatório de Pagamentos", content)
    doc.save("pagamentos-talagas.pdf")
    toast({ title: "PDF gerado", description: "Relatório de pagamentos baixado com sucesso." })
  }

  const downloadPagamentosExcel = () => {
    const data = pagamentoData.map((p) => [
      p.metodo,
      parseFloat(p.total).toLocaleString("pt-AO"),
      p.quantidade,
      `${p.percentual}%`,
    ])
    const wb = generateExcelWithBranding(
      "Pagamentos",
      data,
      ["Método", "Total", "Quantidade", "Percentual"]
    )
    require("xlsx").writeFile(wb, "pagamentos-talagas.xlsx")
    toast({ title: "Excel gerado", description: "Relatório de pagamentos baixado com sucesso." })
  }

  const downloadTendenciasPDF = () => {
    let content = "ANÁLISE DE TENDÊNCIAS\n\n"
    content += "MÊS ATUAL\n"
    content += `Receita: Kzs ${parseFloat(tendenciasData?.mesAtual.receita || "0").toLocaleString("pt-AO")}\n`
    content += `Pedidos: ${tendenciasData?.mesAtual.pedidos}\n\n`
    content += "MÊS ANTERIOR\n"
    content += `Receita: Kzs ${parseFloat(tendenciasData?.mesAnterior.receita || "0").toLocaleString("pt-AO")}\n`
    content += `Pedidos: ${tendenciasData?.mesAnterior.pedidos}\n\n`
    content += "CRESCIMENTO\n"
    content += `Receita: ${tendenciasData?.crescimento.receita}\n`
    content += `Pedidos: ${tendenciasData?.crescimento.pedidos}\n`
    const doc = generatePDFWithBranding("Relatório de Tendências", content)
    doc.save("tendencias-talagas.pdf")
    toast({ title: "PDF gerado", description: "Relatório de tendências baixado com sucesso." })
  }

  const downloadTendenciasExcel = () => {
    const data = [
      ["Mês Atual", parseFloat(tendenciasData?.mesAtual.receita || "0").toLocaleString("pt-AO"), tendenciasData?.mesAtual.pedidos],
      ["Mês Anterior", parseFloat(tendenciasData?.mesAnterior.receita || "0").toLocaleString("pt-AO"), tendenciasData?.mesAnterior.pedidos],
      ["Crescimento", tendenciasData?.crescimento.receita, tendenciasData?.crescimento.pedidos],
    ]
    const wb = generateExcelWithBranding(
      "Tendências",
      data,
      ["Período", "Receita", "Pedidos"]
    )
    require("xlsx").writeFile(wb, "tendencias-talagas.xlsx")
    toast({ title: "Excel gerado", description: "Relatório de tendências baixado com sucesso." })
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <AppHeader title="Relatórios" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <MaterialIcon icon="trending_up" className="text-5xl text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Carregando dados do dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Relatórios & Dashboard" />

      <div className="flex-1 space-y-6 p-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="transportadores">Transportadores</TabsTrigger>
            <TabsTrigger value="analise">Análise</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Filtro de período */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: "hoje" as const, label: "Hoje" },
                { value: "semana" as const, label: "Esta Semana" },
                { value: "7dias" as const, label: "Este Mês" },
                { value: "ano" as const, label: "Este Ano" },
              ].map((period) => (
                <Button
                  key={period.value}
                  variant={dateRange === period.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateRange(period.value)}
                >
                  {period.label}
                </Button>
              ))}
            </div>

            {/* Download Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadPDF("dashboard")}>
                <MaterialIcon icon="picture_as_pdf" className="mr-2" />
                Baixar PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadExcel("dashboard")}>
                <MaterialIcon icon="table_chart" className="mr-2" />
                Baixar Excel
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total de Pedidos */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-100">
                    <MaterialIcon icon="shopping_cart" className="text-2xl text-blue-700" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData?.totalPedidos ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboardData?.pedidosHoje ?? 0} hoje
                  </p>
                  <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${dashboardData?.totalPedidos ? Math.min((dashboardData.pedidosHoje / dashboardData.totalPedidos) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Receita Total */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <div className="p-2 rounded-lg bg-green-100">
                    <MaterialIcon icon="attach_money" className="text-2xl text-green-700" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboardData?.receita ? `Kzs ${dashboardData.receita.toLocaleString("pt-AO")}` : "Kzs 0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hoje: {dashboardData?.receitaHoje ? `Kzs ${dashboardData.receitaHoje.toLocaleString("pt-AO")}` : "Kzs 0"}
                  </p>
                  <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${dashboardData?.receita ? Math.min((dashboardData.receitaHoje / dashboardData.receita) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Médio */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-100">
                    <MaterialIcon icon="analytics" className="text-2xl text-purple-700" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboardData?.ticketMedio ? `Kzs ${parseFloat(dashboardData.ticketMedio).toLocaleString("pt-AO")}` : "Kzs 0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor médio por pedido
                  </p>
                  <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-full" />
                  </div>
                </CardContent>
              </Card>

              {/* Taxa de Entrega */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
                  <div className="p-2 rounded-lg bg-orange-100">
                    <MaterialIcon icon="trending_up" className="text-2xl text-orange-700" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboardData?.totalPedidos
                      ? `${Math.round((dashboardData.pedidosPorStatus.find(p => p.status === "entregue")?.total ?? 0) / dashboardData.totalPedidos * 100)}%`
                      : "0%"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboardData?.pedidosPorStatus.find(p => p.status === "entregue")?.total ?? 0} pedidos entregues
                  </p>
                  <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{
                        width: `${dashboardData?.totalPedidos ? ((dashboardData.pedidosPorStatus.find(p => p.status === "entregue")?.total ?? 0) / dashboardData.totalPedidos) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Pedidos por Status</CardTitle>
                <CardDescription>Visualização dos pedidos por estado atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {dashboardData?.pedidosPorStatus.map((item) => {
                    const config = getStatusConfig(item.status)
                    const total = dashboardData.totalPedidos || 1
                    const percentage = (item.total / total) * 100

                    return (
                      <div
                        key={item.status}
                        className="rounded-lg border p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={cn("p-3 rounded-lg", config.color)}>
                            <MaterialIcon icon={config.icon} className="text-2xl" />
                          </div>
                          <Badge variant={config.variant} className="text-lg px-3 py-1">
                            {item.total}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-semibold">{config.label}</h3>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Percentual</span>
                              <span className="font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  item.status === "pendente" && "bg-destructive",
                                  item.status === "confirmado" && "bg-primary",
                                  item.status === "entregue" && "bg-green-500",
                                  item.status === "cancelado" && "bg-gray-400"
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendas Tab */}
          <TabsContent value="vendas" className="space-y-6">
            {/* Filtros */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={periodo} onValueChange={(value: any) => setPeriodo(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">Por Dia</SelectItem>
                    <SelectItem value="semana">Por Semana</SelectItem>
                    <SelectItem value="7dias">Por Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>

              <Button onClick={() => loadVendas()}>
                <MaterialIcon icon="search" className="mr-2" />
                Buscar
              </Button>
            </div>

            {/* Download Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadPDF("vendas")}>
                <MaterialIcon icon="picture_as_pdf" className="mr-2" />
                Baixar PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadExcel("vendas")}>
                <MaterialIcon icon="table_chart" className="mr-2" />
                Baixar Excel
              </Button>
            </div>

            {/* Resumo */}
            {vendaData && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        Kzs {vendaData.resumo.totalVendas?.toLocaleString("pt-AO") ?? 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{vendaData.resumo.totalPedidos ?? 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total de Frete</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        Kzs {vendaData.resumo.totalFrete?.toLocaleString("pt-AO") ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhes por Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">Data</th>
                            <th className="text-right py-2 px-4">Total</th>
                            <th className="text-right py-2 px-4">Quantidade</th>
                            <th className="text-right py-2 px-4">Frete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendaData.data.map((venda, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-4">{venda._id}</td>
                              <td className="text-right py-2 px-4">
                                Kzs {venda.total?.toLocaleString("pt-AO") ?? 0}
                              </td>
                              <td className="text-right py-2 px-4">{venda.quantidade}</td>
                              <td className="text-right py-2 px-4">
                                Kzs {venda.frete?.toLocaleString("pt-AO") ?? 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Produtos Tab */}
          <TabsContent value="produtos" className="space-y-6">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadProdutosPDF}>
                <MaterialIcon icon="picture_as_pdf" className="mr-2" />
                Baixar PDF
              </Button>
              <Button variant="outline" size="sm" onClick={downloadProdutosExcel}>
                <MaterialIcon icon="table_chart" className="mr-2" />
                Baixar Excel
              </Button>
            </div>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance de Produtos</CardTitle>
                  <CardDescription>Produtos mais vendidos e receita gerada</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-orange-50">
                          <th className="text-left py-3 px-4 font-semibold text-orange-700">Produto</th>
                          <th className="text-right py-3 px-4 font-semibold text-orange-700">Total Vendido</th>
                          <th className="text-right py-3 px-4 font-semibold text-orange-700">Receita</th>
                          <th className="text-right py-3 px-4 font-semibold text-orange-700">Pedidos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{item.produto}</td>
                            <td className="text-right py-3 px-4 font-semibold">{item.totalVendido}</td>
                            <td className="text-right py-3 px-4">Kzs {parseFloat(item.receita).toLocaleString("pt-AO")}</td>
                            <td className="text-right py-3 px-4">{item.pedidos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transportadores Tab */}
          <TabsContent value="transportadores" className="space-y-6">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTransportadoresPDF}>
                <MaterialIcon icon="picture_as_pdf" className="mr-2" />
                Baixar PDF
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTransportadoresExcel}>
                <MaterialIcon icon="table_chart" className="mr-2" />
                Baixar Excel
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {transportadorData.map((item) => (
                <Card key={item.transportadorId} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{item.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entregas:</span>
                      <span className="font-semibold">{item.totalEntregas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receita:</span>
                      <span className="font-semibold">Kzs {parseFloat(item.receita).toLocaleString("pt-AO")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frete Médio:</span>
                      <span className="font-semibold">Kzs {parseFloat(item.freteMedio).toLocaleString("pt-AO")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Análise Tab */}
          <TabsContent value="analise" className="space-y-6">
            {/* Pagamentos */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadPagamentosPDF}>
                  <MaterialIcon icon="picture_as_pdf" className="mr-2" />
                  Baixar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={downloadPagamentosExcel}>
                  <MaterialIcon icon="table_chart" className="mr-2" />
                  Baixar Excel
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pagamentoData.map((item) => (
                      <div key={item.metodo} className="rounded-lg border p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold capitalize">{item.metodo}</h3>
                          <Badge className="bg-orange-600">{item.percentual}%</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Total:</span>
                            <span className="font-semibold">Kzs {parseFloat(item.total).toLocaleString("pt-AO")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Quantidade:</span>
                            <span className="font-semibold">{item.quantidade}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-orange-600"
                              style={{ width: `${item.percentual}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tendências */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTendenciasPDF}>
                  <MaterialIcon icon="picture_as_pdf" className="mr-2" />
                  Baixar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={downloadTendenciasExcel}>
                  <MaterialIcon icon="table_chart" className="mr-2" />
                  Baixar Excel
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Mês Atual</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="text-2xl font-bold">Kzs {parseFloat(tendenciasData?.mesAtual.receita || "0").toLocaleString("pt-AO")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p className="text-2xl font-bold">{tendenciasData?.mesAtual.pedidos}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Mês Anterior</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="text-2xl font-bold">Kzs {parseFloat(tendenciasData?.mesAnterior.receita || "0").toLocaleString("pt-AO")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p className="text-2xl font-bold">{tendenciasData?.mesAnterior.pedidos}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Crescimento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="text-2xl font-bold text-green-600">{tendenciasData?.crescimento.receita}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p className="text-2xl font-bold text-green-600">{tendenciasData?.crescimento.pedidos}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
