"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import * as produtoService from "@/services/produtoService"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/api"

const CATEGORIAS = ["Garrafas", "Equipamentos", "Acessórios"]
const FORNECEDORES = ["SonaGás", "Gástem", "ProGás", "SonaGás", "Outros"]

interface InventoryItem {
  id: string
  tipo: string
  peso: string
  quantidade: number
  minimo: number
  preco: number
  disponibilidade?: "disponivel" | "indisponivel"
  categoria?: string
  descricao?: string
  fornecedor?: string
  capacidade?: number
  files?: File[]
  frete?: string
  urls?: string[]
  createdAt?: string
  updatedAt?: string
}

export default function EstoquePage() {
  const { toast } = useToast()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<{
    total: number
    alertas: number
    totalAkz: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<{
    id: string
    descricao: string
    tipo: string
    capacidade: string
    preco: string
    fornecedor: string
    disponibilidade: "disponivel" | "indisponivel"
    quantidade: string
    categoria: string
    files: File[] | null
    frete: string
  } | null>(null)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState<{
    descricao: string
    tipo: string
    capacidade: string
    preco: string
    fornecedor: string
    disponibilidade: "disponivel" | "indisponivel"
    quantidade: string
    categoria: string
    files: File[] | null
    frete: string
  }>({
    descricao: "",
    tipo: "",
    capacidade: "",
    preco: "",
    fornecedor: "",
    disponibilidade: "disponivel",
    quantidade: "",
    categoria: "Garrafas",
    files: null,
    frete: "",
  })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
const [isSubmittingProduct, setIsSubmittingProduct] = useState(false)
const [inventoryViewMode, setInventoryViewMode] = useState<"grid" | "list">("grid")

  // Atualiza quantidade no local + no backend (otimista)
  const handleUpdateStock = async (id: string, newQuantity: number) => {
    const prev = inventory
    const updated = prev.map((item) =>
      item.id === id ? { ...item, quantidade: Math.max(0, newQuantity) } : item,
    )
    setInventory(updated)

    try {
      const apiResult = await produtoService.updateProdutoEmpresa(id, {
        quantidade: Math.max(0, newQuantity),
      })
      const produto = apiResult.produtoId || ({} as any)
      const capacidade = produto.capacidade ?? undefined
      const peso = capacidade ? `${capacidade}Kg` : produto.descricao ?? "Botijão"
      const preco = apiResult.preco ?? produto.preco ?? 0
      const disponibilidade = apiResult.disponibilidade ?? "disponivel"
      setInventory((curr) =>
        curr.map((it) =>
          it.id === id
            ? {
                ...it,
                quantidade: apiResult.quantidade ?? newQuantity,
                preco,
                peso,
                tipo: produto.descricao ?? it.tipo,
                disponibilidade,
              }
            : it,
        ),
      )
      toast({
        title: "Estoque atualizado",
        description: "Quantidade atualizada no servidor.",
      })
    } catch (err: any) {
      setInventory(prev)
      console.error(err)
      toast({
        title: "Erro ao atualizar estoque",
        description: err?.message ?? "Não foi possível atualizar a quantidade.",
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!editItem) return
    const prev = inventory
    // otimista: aplicar na UI
    setInventory((prevList) =>
      prevList.map((it) => (it.id === editItem.id ? editItem : it)),
    )

    try {
      const payload = {
        quantidade: editItem.quantidade,
        preco: editItem.preco,
        disponibilidade: editItem.disponibilidade ?? "disponivel",
      } as any

      const apiResult = await produtoService.updateProdutoEmpresa(editItem.id, payload)

      const produto = apiResult.produtoId || ({} as any)
      const capacidade = produto.capacidade ?? undefined
      const peso = capacidade ? `${capacidade}Kg` : produto.descricao ?? editItem.tipo
      const preco = apiResult.preco ?? produto.preco ?? editItem.preco

      setInventory((curr) =>
        curr.map((it) =>
          it.id === editItem.id
            ? {
                ...it,
                quantidade: apiResult.quantidade ?? editItem.quantidade,
                preco,
                peso,
                tipo: produto.descricao ?? editItem.tipo,
                disponibilidade: apiResult.disponibilidade ?? editItem.disponibilidade,
              }
            : it,
        ),
      )

      toast({
        title: "Item atualizado",
        description: "As informações foram salvas com sucesso.",
      })
      setIsDialogOpen(false)
      setEditItem(null)
    } catch (err: any) {
      // rollback
      setInventory(prev)
      console.error(err)
      toast({
        title: "Erro ao salvar item",
        description: err?.message ?? "Não foi possível salvar as alterações.",
      })
    }
  }

  // Adicionar produto
  const clearAddError = (field: string) =>
    setAddErrors((prev) => {
      if (!(field in prev)) return prev
      const { [field]: _removed, ...rest } = prev
      return rest
    })

  const validateAddForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    const descricao = addForm.descricao.trim()
    if (descricao.length < 3) {
      errors.descricao = "Descrição deve ter pelo menos 3 caracteres."
    }
    if (!addForm.tipo.trim()) {
      errors.tipo = "Tipo é obrigatório."
    }
    if (!addForm.capacidade.trim()) {
      errors.capacidade = "Capacidade é obrigatória."
    }
    const parsedPreco = Number(addForm.preco)
    if (!addForm.preco.trim() || Number.isNaN(parsedPreco) || parsedPreco <= 0) {
      errors.preco = "Preço deve ser um número positivo."
    }
    if (addForm.quantidade.trim()) {
      const parsedQuantidade = Number(addForm.quantidade)
      if (Number.isNaN(parsedQuantidade) || parsedQuantidade < 0) {
        errors.quantidade = "Quantidade deve ser um número maior ou igual a zero."
      }
    }
    if (!["disponivel", "indisponivel"].includes(addForm.disponibilidade)) {
      errors.disponibilidade = "Disponibilidade inválida."
    }
    if (addForm.frete.trim()) {
      const parsedFrete = Number(addForm.frete)
      if (Number.isNaN(parsedFrete) || parsedFrete < 0) {
        errors.frete = "Frete deve ser um número maior ou igual a zero."
      }
    }
    return errors
  }

  const handleAddProduct = async () => {
    try {
    if (isSubmittingProduct) return
      const validation = validateAddForm()
      if (Object.keys(validation).length > 0) {
        setAddErrors(validation)
        toast({
          title: "Corrija os campos obrigatórios",
          description: "Verifique os dados destacados antes de continuar.",
          variant: "destructive",
        })
        return
      }
      setAddErrors({})
    setIsSubmittingProduct(true)

      const descricao = addForm.descricao.trim()
      const tipo = addForm.tipo.trim()
      const capacidade = addForm.capacidade.trim()
      const fornecedor = addForm.fornecedor.trim()
      const categoria = addForm.categoria.trim()
      const parsedPreco = Number(addForm.preco)
      const parsedQuantidade = addForm.quantidade.trim() !== "" ? Number(addForm.quantidade) : undefined
      const parsedFrete = addForm.frete.trim() !== "" ? Number(addForm.frete) : undefined
      const disponibilidadeEnum = addForm.disponibilidade

      const formData = new FormData()
      formData.append("descricao", descricao)
      formData.append("tipo", tipo)
      formData.append("capacidade", capacidade)
      formData.append("preco", String(parsedPreco))
      formData.append("fornecedor", fornecedor)
      formData.append("disponibilidade", disponibilidadeEnum)
      formData.append("categoria", categoria)
      if (parsedQuantidade !== undefined) formData.append("quantidade", String(parsedQuantidade))
      if (parsedFrete !== undefined) formData.append("frete", String(parsedFrete))
      if (addForm.files && addForm.files.length > 0) {
        for (const file of addForm.files) {
          formData.append("files", file)
        }
      }
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"}/empresas/produto-empresa-with-produto`,
        {
          method: "POST",
          headers: {
            Authorization:
              typeof window !== "undefined"
                ? `Bearer ${JSON.parse(localStorage.getItem("user") || "{}")?.token || ""}`
                : "",
          },
          body: formData,
        },
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const serverErrors: string[] = data?.errors ?? []
        const errorMessage = serverErrors.length ? serverErrors.join(" ") : data?.message ?? "Erro ao cadastrar produto"
        if (serverErrors.length) {
          const fieldErrors: Record<string, string> = {}
        serverErrors.forEach((errMsg) => {
            if (errMsg.toLowerCase().includes("descricao")) fieldErrors.descricao = errMsg
            if (errMsg.toLowerCase().includes("tipo")) fieldErrors.tipo = errMsg
            if (errMsg.toLowerCase().includes("capacidade")) fieldErrors.capacidade = errMsg
            if (errMsg.toLowerCase().includes("preco")) fieldErrors.preco = errMsg
            if (errMsg.toLowerCase().includes("quantidade")) fieldErrors.quantidade = errMsg
            if (errMsg.toLowerCase().includes("frete")) fieldErrors.frete = errMsg
          })
          if (Object.keys(fieldErrors).length > 0) {
            setAddErrors(fieldErrors)
          }
        }
        throw new Error(errorMessage)
      }
      toast({ title: "Produto cadastrado com sucesso!" })
      setIsAddDialogOpen(false)
      setAddForm({
        descricao: "",
        tipo: "",
        capacidade: "",
        preco: "",
        fornecedor: "",
        disponibilidade: "disponivel",
        quantidade: "",
        categoria: "Garrafas",
        files: null,
        frete: "",
      })
      setAddErrors({})
      window.location.reload()
    } catch (err: any) {
      toast({
        title: "Erro ao cadastrar produto",
        description: err?.message ?? "Não foi possível cadastrar o produto.",
        variant: "destructive",
      })
  } finally {
    setIsSubmittingProduct(false)
    }
  }

  // Editar produto
  const handleEditProduct = async () => {
    if (!editForm) return
    try {
      let res
      if (editForm.files && editForm.files.length > 0) {
        const formData = new FormData()
        formData.append("descricao", editForm.descricao)
        formData.append("tipo", editForm.tipo)
        formData.append("capacidade", editForm.capacidade)
        formData.append("preco", editForm.preco)
        formData.append("fornecedor", editForm.fornecedor)
        formData.append("disponibilidade", editForm.disponibilidade)
        formData.append("quantidade", editForm.quantidade)
        formData.append("categoria", editForm.categoria)
        formData.append("frete", editForm.frete)
        for (const file of editForm.files) {
          formData.append("files", file)
        }
        res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"}/empresas/produto-empresa-with-produto/${editForm.id}`,
          {
            method: "PUT",
            headers: {
              Authorization:
                typeof window !== "undefined"
                  ? `Bearer ${JSON.parse(localStorage.getItem("user") || "{}")?.token || ""}`
                  : "",
            },
            body: formData,
          }
        )
      } else {
        res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"}/empresas/produto-empresa-with-produto/${editForm.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                typeof window !== "undefined"
                  ? `Bearer ${JSON.parse(localStorage.getItem("user") || "{}")?.token || ""}`
                  : "",
            },
            body: JSON.stringify({
              descricao: editForm.descricao,
              tipo: editForm.tipo,
              capacidade: editForm.capacidade,
              preco: editForm.preco,
              fornecedor: editForm.fornecedor,
              disponibilidade: editForm.disponibilidade,
              quantidade: editForm.quantidade,
              categoria: editForm.categoria,
              frete: editForm.frete,
            }),
          }
        )
      }
      if (!res.ok) throw new Error("Erro ao editar produto")
      toast({ title: "Produto atualizado com sucesso!" })
      setIsEditDialogOpen(false)
      setEditForm(null)
      window.location.reload()
    } catch (err: any) {
      toast({
        title: "Erro ao editar produto",
        description: err?.message ?? "Não foi possível editar o produto.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"}/empresas/produto-empresa/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              typeof window !== "undefined"
                ? `Bearer ${JSON.parse(localStorage.getItem("user") || "{}")?.token || ""}`
                : "",
          },
        }
      )
      if (!res.ok) throw new Error("Erro ao deletar produto")
      setInventory((prev) => prev.filter((item) => item.id !== id))
      setDeleteConfirm(null)
      toast({ title: "Produto removido", description: "O produto foi deletado com sucesso." })
    } catch (err: any) {
      toast({
        title: "Erro ao deletar produto",
        description: err?.message ?? "Não foi possível deletar o produto.",
        variant: "destructive",
      })
    }
  }

  const getStockStatus = (quantidade: number, minimo: number) => {
    if (quantidade === 0) return { label: "Esgotado", variant: "destructive" as const }
    if (quantidade < minimo) return { label: "Baixo", variant: "destructive" as const }
    if (quantidade < minimo * 1.5) return { label: "Atenção", variant: "default" as const }
    return { label: "Normal", variant: "secondary" as const }
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [produtos, dash] = await Promise.all([
          produtoService.getProdutosEmpresa(),
          produtoService.getProdutosDashboard(),
        ])

        if (!mounted) return

        const mapped = produtos.map((p) => {
          const produto = p.produtoId || ({} as any)
          const capacidade = produto.capacidade ?? undefined
          const peso = capacidade ? `${capacidade}Kg` : produto.descricao ?? "Botijão"
          const preco = p.preco ?? produto.preco ?? 0
          const minimo = 10
          return {
            id: p._id,
            tipo: produto.descricao ?? produto.tipo ?? "Botijão",
            peso,
            quantidade: p.quantidade ?? 0,
            minimo,
            preco,
            frete: p.frete,
            urls: p.urls,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            disponibilidade: p.disponibilidade,
            categoria: produto.categoria,
            fornecedor: produto.fornecedor,
          } as InventoryItem
        })

        setInventory(mapped)
        setSummary({ total: dash.total, alertas: dash.alertas, totalAkz: dash.totalAkz })
      } catch (err: any) {
        console.error(err)
        toast({
          title: "Erro ao carregar dados",
          description: err?.message ?? "Ocorreu um erro ao buscar dados do servidor.",
        })
      } finally {
        setLoading(false)
      }
    }  
    load()
    return () => {
      mounted = false
    }
  }, [toast])

  return (
    <div className="flex flex-col">
      <AppHeader title="Estoque" />

      <div className="flex-1 space-y-6 p-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total em Estoque</CardTitle>
              <MaterialIcon icon="inventory_2" className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary
                  ? summary.total
                  : inventory.reduce((acc, item) => acc + item.quantidade, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Botijões disponíveis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas de Estoque</CardTitle>
              <MaterialIcon icon="warning" className="text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary
                  ? summary.alertas
                  : inventory.filter((item) => item.quantidade < item.minimo).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Itens abaixo do mínimo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <MaterialIcon icon="attach_money" className="text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Kzs{" "}
                {summary
                  ? summary.totalAkz.toLocaleString()
                  : inventory
                      .reduce((acc, item) => acc + item.quantidade * item.preco, 0)
                      .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Valor do estoque</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <Button
              type="button"
              variant={inventoryViewMode === "grid" ? "default" : "ghost"}
              className={`rounded-none ${inventoryViewMode === "grid" ? "" : "text-muted-foreground"}`}
              onClick={() => setInventoryViewMode("grid")}
            >
              <MaterialIcon icon="grid_view" className="mr-2 text-base" />
              Grade
            </Button>
            <Button
              type="button"
              variant={inventoryViewMode === "list" ? "default" : "ghost"}
              className={`rounded-none ${inventoryViewMode === "list" ? "" : "text-muted-foreground"}`}
              onClick={() => setInventoryViewMode("list")}
            >
              <MaterialIcon icon="view_list" className="mr-2 text-base" />
              Lista
            </Button>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
            <MaterialIcon icon="add" className="mr-2" />
            Cadastrar Produto
          </Button>
        </div>

        {/* Modal de cadastro de produto */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Produto</DialogTitle>
              <DialogDescription>Preencha os dados do novo produto</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={e => {
                e.preventDefault()
                handleAddProduct()
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={addForm.descricao}
                    onChange={e => {
                      setAddForm(f => ({ ...f, descricao: e.target.value }))
                      clearAddError("descricao")
                    }}
                    className={addErrors.descricao ? "border-destructive focus-visible:ring-destructive" : undefined}
                    placeholder="Ex: Botija 12kg"
                  />
                  {addErrors.descricao && <p className="text-xs text-destructive">{addErrors.descricao}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input
                    value={addForm.tipo}
                    onChange={e => {
                      setAddForm(f => ({ ...f, tipo: e.target.value }))
                      clearAddError("tipo")
                    }}
                    className={addErrors.tipo ? "border-destructive focus-visible:ring-destructive" : undefined}
                    placeholder="Ex: GLP"
                  />
                  {addErrors.tipo && <p className="text-xs text-destructive">{addErrors.tipo}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Capacidade (kg)</Label>
                  <Input
                    type="number"
                    value={addForm.capacidade}
                    onChange={e => {
                      setAddForm(f => ({ ...f, capacidade: e.target.value }))
                      clearAddError("capacidade")
                    }}
                    className={addErrors.capacidade ? "border-destructive focus-visible:ring-destructive" : undefined}
                    placeholder="Ex: 12"
                  />
                  {addErrors.capacidade && <p className="text-xs text-destructive">{addErrors.capacidade}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Preço (Kz)</Label>
                  <Input
                    type="number"
                    value={addForm.preco}
                    onChange={e => {
                      setAddForm(f => ({ ...f, preco: e.target.value }))
                      clearAddError("preco")
                    }}
                    className={addErrors.preco ? "border-destructive focus-visible:ring-destructive" : undefined}
                    placeholder="Ex: 15000"
                  />
                  {addErrors.preco && <p className="text-xs text-destructive">{addErrors.preco}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Frete (Kz)</Label>
                  <Input
                    type="number"
                    value={addForm.frete}
                    onChange={e => {
                      setAddForm(f => ({ ...f, frete: e.target.value }))
                      clearAddError("frete")
                    }}
                    className={addErrors.frete ? "border-destructive focus-visible:ring-destructive" : undefined}
                    placeholder="Ex: 2000"
                  />
                  {addErrors.frete && <p className="text-xs text-destructive">{addErrors.frete}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={addForm.fornecedor}
                    onValueChange={value => setAddForm(f => ({ ...f, fornecedor: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORNECEDORES.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={addForm.categoria}
                    onValueChange={value => setAddForm(f => ({ ...f, categoria: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Disponibilidade</Label>
                  <Select
                    value={addForm.disponibilidade}
                    onValueChange={value => {
                      setAddForm(f => ({ ...f, disponibilidade: value as "disponivel" | "indisponivel" }))
                      clearAddError("disponibilidade")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue className={addErrors.disponibilidade ? "text-destructive" : undefined} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="indisponivel">Indisponível</SelectItem>
                    </SelectContent>
                  </Select>
                  {addErrors.disponibilidade && (
                    <p className="text-xs text-destructive">{addErrors.disponibilidade}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={addForm.quantidade}
                    onChange={e => {
                      setAddForm(f => ({ ...f, quantidade: e.target.value }))
                      clearAddError("quantidade")
                    }}
                    className={addErrors.quantidade ? "border-destructive focus-visible:ring-destructive" : undefined}
                    placeholder="Ex: 10"
                  />
                  {addErrors.quantidade && <p className="text-xs text-destructive">{addErrors.quantidade}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Imagens</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => setAddForm(f => ({ ...f, files: e.target.files ? Array.from(e.target.files) : null }))}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmittingProduct} className="min-w-[140px]">
                  {isSubmittingProduct ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Cadastrar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de edição de produto */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
              <DialogDescription>Atualize os dados do produto</DialogDescription>
            </DialogHeader>
            {editForm && (
              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleEditProduct()
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={editForm.descricao}
                      onChange={e => setEditForm(f => f ? { ...f, descricao: e.target.value } : f)}
                      placeholder="Ex: Botija 12kg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Input
                      value={editForm.tipo}
                      onChange={e => setEditForm(f => f ? { ...f, tipo: e.target.value } : f)}
                      placeholder="Ex: GLP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidade (kg)</Label>
                    <Input
                      type="number"
                      value={editForm.capacidade}
                      onChange={e => setEditForm(f => f ? { ...f, capacidade: e.target.value } : f)}
                      placeholder="Ex: 12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (Kz)</Label>
                    <Input
                      type="number"
                      value={editForm.preco}
                      onChange={e => setEditForm(f => f ? { ...f, preco: e.target.value } : f)}
                      placeholder="Ex: 15000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frete (Kz)</Label>
                    <Input
                      type="number"
                      value={editForm.frete}
                      onChange={e => setEditForm(f => f ? { ...f, frete: e.target.value } : f)}
                      placeholder="Ex: 2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Select
                      value={editForm.fornecedor}
                      onValueChange={value => setEditForm(f => f ? { ...f, fornecedor: value } : f)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORNECEDORES.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={editForm.categoria}
                      onValueChange={value => setEditForm(f => f ? { ...f, categoria: value } : f)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Disponibilidade</Label>
                    <Select
                      value={editForm.disponibilidade}
                      onValueChange={value => setEditForm(f => f ? { ...f, disponibilidade: value as "disponivel" | "indisponivel" } : f)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponivel">Disponível</SelectItem>
                        <SelectItem value="indisponivel">Indisponível</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value={editForm.quantidade}
                      onChange={e => setEditForm(f => f ? { ...f, quantidade: e.target.value } : f)}
                      placeholder="Ex: 10"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Imagens</Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={e => setEditForm(f => f ? { ...f, files: e.target.files ? Array.from(e.target.files) : null } : f)}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Inventory Views */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Carregando estoque...
              </CardContent>
            </Card>
          ) : inventory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MaterialIcon icon="inventory_2" className="mx-auto mb-4 text-4xl text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum produto cadastrado</p>
              </CardContent>
            </Card>
          ) : inventoryViewMode === "list" ? (
            <div className="bg-white rounded-lg border border-border divide-y">
              {inventory.map((item) => {
                const status = getStockStatus(item.quantidade, item.minimo)
                const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-AO") : "-"
                const hasImages = item.urls && item.urls.length > 0
                return (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-muted/30 transition">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative w-20 h-20 bg-muted/50 rounded-lg overflow-hidden flex-shrink-0">
                        {hasImages ? (
                          <img src={item.urls![0]} alt={item.tipo} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MaterialIcon icon="image_not_supported" className="text-2xl text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge variant="outline" className="text-[10px]">{status.label}</Badge>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-gray-900 truncate">{item.tipo}</h3>
                          {item.categoria && <Badge variant="secondary" className="text-[10px]">{item.categoria}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{item.peso}</p>
                        <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="text-muted-foreground">Qtd:</span>{" "}
                            <span className="font-semibold text-gray-900">{item.quantidade}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Preço:</span>{" "}
                            <span className="font-semibold text-gray-900">{item.preco} Kz</span>
                          </div>
                          {item.frete && (
                            <div>
                              <span className="text-muted-foreground">Frete:</span>{" "}
                              <span className="font-semibold text-gray-900">{item.frete} Kz</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Criado:</span>{" "}
                            <span className="font-semibold text-gray-900">{createdDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStock(item.id, item.quantidade - 1)}
                        title="Diminuir quantidade"
                      >
                        <MaterialIcon icon="remove" className="text-sm" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditForm({
                            id: item.id,
                            descricao: item.descricao ?? item.tipo,
                            tipo: item.tipo,
                            capacidade: item.capacidade ? String(item.capacidade) : "",
                            preco: item.preco ? String(item.preco) : "",
                            fornecedor: item.fornecedor ?? "",
                            disponibilidade: item.disponibilidade ?? "disponivel",
                            quantidade: String(item.quantidade),
                            categoria: item.categoria ?? "Garrafas",
                            files: null,
                            frete: item.frete ?? "",
                          })
                          setIsEditDialogOpen(true)
                        }}
                        title="Editar produto"
                      >
                        <MaterialIcon icon="edit" className="text-sm" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStock(item.id, item.quantidade + 1)}
                        title="Aumentar quantidade"
                      >
                        <MaterialIcon icon="add" className="text-sm" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteConfirm(item.id)}
                      >
                        <MaterialIcon icon="delete" className="mr-1 text-sm" />
                        Remover
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inventory.map((item) => {
                const status = getStockStatus(item.quantidade, item.minimo)
                const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-AO") : "-"
                const hasImages = item.urls && item.urls.length > 0

                return (
                  <Card key={item.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-40 bg-muted/50 overflow-hidden">
                      {hasImages ? (
                        <img
                          src={item.urls![0]}
                          alt={item.tipo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MaterialIcon icon="image_not_supported" className="text-4xl text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      {item.categoria && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="outline" className="text-xs">{item.categoria}</Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="flex-1 pt-4 pb-3">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-base line-clamp-1">{item.tipo}</h3>
                          <p className="text-xs text-muted-foreground">{item.peso}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Quantidade:</span>
                            <span className="font-semibold">{item.quantidade}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Preço:</span>
                            <span className="font-semibold">{item.preco} Kzs</span>
                          </div>
                          {item.frete && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Frete:</span>
                              <span className="font-semibold">{item.frete} Kzs</span>
                            </div>
                          )}
                          {item.fornecedor && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Fornecedor:</span>
                              <span className="text-xs">{item.fornecedor}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                          <MaterialIcon icon="calendar_today" className="text-sm" />
                          Criado em {createdDate}
                        </div>
                      </div>
                    </CardContent>

                    <div className="border-t p-3 grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStock(item.id, item.quantidade - 1)}
                        title="Diminuir quantidade"
                      >
                        <MaterialIcon icon="remove" className="text-sm" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditForm({
                            id: item.id,
                            descricao: item.descricao ?? item.tipo,
                            tipo: item.tipo,
                            capacidade: item.capacidade ? String(item.capacidade) : "",
                            preco: item.preco ? String(item.preco) : "",
                            fornecedor: item.fornecedor ?? "",
                            disponibilidade: item.disponibilidade ?? "disponivel",
                            quantidade: String(item.quantidade),
                            categoria: item.categoria ?? "Garrafas",
                            files: null,
                            frete: item.frete ?? "",
                          })
                          setIsEditDialogOpen(true)
                        }}
                        title="Editar produto"
                      >
                        <MaterialIcon icon="edit" className="text-sm" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStock(item.id, item.quantidade + 1)}
                        title="Aumentar quantidade"
                      >
                        <MaterialIcon icon="add" className="text-sm" />
                      </Button>
                    </div>

                    <div className="border-t p-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => setDeleteConfirm(item.id)}
                      >
                        <MaterialIcon icon="delete" className="mr-2 text-sm" />
                        Remover Produto
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alert Dialog para confirmação de exclusão */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover este produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm text-destructive font-semibold">
              Produto: {inventory.find(p => p.id === deleteConfirm)?.tipo}
            </p>
          </div>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (deleteConfirm) {
                handleDeleteProduct(deleteConfirm)
              }
            }}
            className="bg-destructive hover:bg-destructive/90"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
