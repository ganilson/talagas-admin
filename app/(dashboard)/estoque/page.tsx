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
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import * as produtoService from "@/services/produtoService" // novo serviço
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<{
    id: string
    descricao: string
    tipo: string
    capacidade: string
    preco: string
    fornecedor: string
    estabelecimentoId: string
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
    estabelecimentoId: string
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
    estabelecimentoId: "",
    disponibilidade: "disponivel",
    quantidade: "",
    categoria: "Garrafas",
    files: null,
    frete: "",
  })

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
      // mapear resposta para InventoryItem e aplicar (caso backend retorne campos diferentes)
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
      // rollback
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
  const handleAddProduct = async () => {
    try {
      const formData = new FormData()
      if (addForm.descricao) formData.append("descricao", addForm.descricao)
      if (addForm.tipo) formData.append("tipo", addForm.tipo)
      if (addForm.capacidade) formData.append("capacidade", addForm.capacidade)
      if (addForm.preco) formData.append("preco", addForm.preco)
      if (addForm.fornecedor) formData.append("fornecedor", addForm.fornecedor)
      if (addForm.estabelecimentoId) formData.append("estabelecimentoId", addForm.estabelecimentoId)
      if (addForm.disponibilidade) formData.append("disponibilidade", addForm.disponibilidade)
      if (addForm.quantidade) formData.append("quantidade", addForm.quantidade)
      if (addForm.categoria) formData.append("categoria", addForm.categoria)
      if (addForm.frete) formData.append("frete", addForm.frete)
      if (addForm.files && addForm.files.length > 0) {
        for (const file of addForm.files) {
          formData.append("files", file)
        }
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"}/empresas/produto-empresa-with-produto`,
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
      if (!res.ok) throw new Error("Erro ao cadastrar produto")
      toast({ title: "Produto cadastrado com sucesso!" })
      setIsAddDialogOpen(false)
      setAddForm({
        descricao: "",
        tipo: "",
        capacidade: "",
        preco: "",
        fornecedor: "",
        estabelecimentoId: "",
        disponibilidade: "disponivel",
        quantidade: "",
        categoria: "Garrafas",
        files: null,
        frete: "",
      })
      // Opcional: recarregar lista
      window.location.reload()
    } catch (err: any) {
      toast({
        title: "Erro ao cadastrar produto",
        description: err?.message ?? "Não foi possível cadastrar o produto.",
        variant: "destructive",
      })
    }
  }

  // Editar produto
  const handleEditProduct = async () => {
    if (!editForm) return
    try {
      let res;
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
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"}/empresas/produto-empresa-with-produto/${editForm.id}`,
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
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"}/empresas/produto-empresa-with-produto/${editForm.id}`,
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

        // Mapear produtos da API para InventoryItem
        const mapped = produtos.map((p) => {
          const produto = p.produtoId || ({} as any)
          const capacidade = produto.capacidade ?? undefined
          const peso = capacidade ? `${capacidade}Kg` : produto.descricao ?? "Botijão"
          const preco = p.preco ?? produto.preco ?? 0
          // mínimo não vem da API neste endpoint pelo exemplo; usar padrão 10
          const minimo = 10
          return {
            id: p._id,
            tipo: produto.descricao ?? produto.tipo ?? "Botijão",
            peso,
            quantidade: p.quantidade ?? 0,
            minimo,
            preco,
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

        <div className="flex justify-end mb-4">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <MaterialIcon icon="add" className="mr-2" />
            Cadastrar Produto
          </Button>
        </div>

        {/* Modal de cadastro de produto */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl">
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
                    onChange={e => setAddForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Ex: Botija 12kg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input
                    value={addForm.tipo}
                    onChange={e => setAddForm(f => ({ ...f, tipo: e.target.value }))}
                    placeholder="Ex: GLP"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacidade (kg)</Label>
                  <Input
                    type="number"
                    value={addForm.capacidade}
                    onChange={e => setAddForm(f => ({ ...f, capacidade: e.target.value }))}
                    placeholder="Ex: 12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço (Kz)</Label>
                  <Input
                    type="number"
                    value={addForm.preco}
                    onChange={e => setAddForm(f => ({ ...f, preco: e.target.value }))}
                    placeholder="Ex: 15000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frete (Kz)</Label>
                  <Input
                    type="number"
                    value={addForm.frete}
                    onChange={e => setAddForm(f => ({ ...f, frete: e.target.value }))}
                    placeholder="Ex: 2000"
                  />
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
                    onValueChange={value => setAddForm(f => ({ ...f, disponibilidade: value as "disponivel" | "indisponivel" }))}
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
                    value={addForm.quantidade}
                    onChange={e => setAddForm(f => ({ ...f, quantidade: e.target.value }))}
                    placeholder="Ex: 10"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Imagens</Label>
                  <Input
                    type="file"
                    multiple
                    onChange={e => setAddForm(f => ({ ...f, files: e.target.files ? Array.from(e.target.files) : null }))}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de edição de produto */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
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

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Botijões</CardTitle>
            <CardDescription>Controle de estoque de botijões de gás</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Carregando estoque...
                </div>
              ) : (
                inventory.map((item) => {
                  const status = getStockStatus(item.quantidade, item.minimo)
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <MaterialIcon
                          icon="local_gas_station"
                          className="text-2xl text-primary"
                        />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {item.tipo} {item.peso}
                          </h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: {item.quantidade} | Mínimo: {item.minimo} | Preço:{" "}
                          {item.preco} Kzs
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateStock(item.id, item.quantidade - 1)}
                        >
                          <MaterialIcon icon="remove" />
                        </Button>
                        <span className="w-12 text-center font-semibold">
                          {item.quantidade}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateStock(item.id, item.quantidade + 1)}
                        >
                          <MaterialIcon icon="add" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditForm({
                              id: item.id,
                              descricao: item.descricao ?? item.tipo,
                              tipo: item.tipo,
                              capacidade: item.capacidade ? String(item.capacidade) : "",
                              preco: item.preco ? String(item.preco) : "",
                              fornecedor: item.fornecedor ?? "",
                              estabelecimentoId: "",
                              disponibilidade: item.disponibilidade ?? "disponivel",
                              quantidade: String(item.quantidade),
                              categoria: item.categoria ?? "Garrafas",
                              files: null,
                              frete: item.frete ?? "",
                            })
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <MaterialIcon icon="edit" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
