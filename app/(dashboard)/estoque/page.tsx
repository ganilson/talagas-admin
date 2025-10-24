"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

interface InventoryItem {
  id: string
  tipo: string
  peso: string
  quantidade: number
  minimo: number
  preco: number
}

export default function EstoquePage() {
  const { toast } = useToast()
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: "1", tipo: "Botijão", peso: "6kg", quantidade: 45, minimo: 20, preco: 65 },
    { id: "2", tipo: "Botijão", peso: "13kg", quantidade: 12, minimo: 30, preco: 95 },
    { id: "3", tipo: "Botijão", peso: "20kg", quantidade: 28, minimo: 15, preco: 135 },
    { id: "4", tipo: "Botijão", peso: "45kg", quantidade: 8, minimo: 10, preco: 280 },
  ])

  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleUpdateStock = (id: string, newQuantity: number) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantidade: Math.max(0, newQuantity) } : item)),
    )
    toast({
      title: "Estoque atualizado",
      description: "A quantidade foi atualizada com sucesso.",
    })
  }

  const handleSaveEdit = () => {
    if (editItem) {
      setInventory((prev) => prev.map((item) => (item.id === editItem.id ? editItem : item)))
      toast({
        title: "Item atualizado",
        description: "As informações foram salvas com sucesso.",
      })
      setIsDialogOpen(false)
      setEditItem(null)
    }
  }

  const getStockStatus = (quantidade: number, minimo: number) => {
    if (quantidade === 0) return { label: "Esgotado", variant: "destructive" as const }
    if (quantidade < minimo) return { label: "Baixo", variant: "destructive" as const }
    if (quantidade < minimo * 1.5) return { label: "Atenção", variant: "default" as const }
    return { label: "Normal", variant: "secondary" as const }
  }

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
              <div className="text-2xl font-bold">{inventory.reduce((acc, item) => acc + item.quantidade, 0)}</div>
              <p className="text-xs text-muted-foreground">Botijões disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas de Estoque</CardTitle>
              <MaterialIcon icon="warning" className="text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inventory.filter((item) => item.quantidade < item.minimo).length}
              </div>
              <p className="text-xs text-muted-foreground">Itens abaixo do mínimo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <MaterialIcon icon="attach_money" className="text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Kzs {inventory.reduce((acc, item) => acc + item.quantidade * item.preco, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Valor do estoque</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Botijões</CardTitle>
            <CardDescription>Controle de estoque de botijões de gás</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventory.map((item) => {
                const status = getStockStatus(item.quantidade, item.minimo)
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MaterialIcon icon="local_gas_station" className="text-2xl text-primary" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {item.tipo} {item.peso}
                        </h3>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Quantidade: {item.quantidade} | Mínimo: {item.minimo} | Preço:  {item.preco} Kzs
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
                      <span className="w-12 text-center font-semibold">{item.quantidade}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleUpdateStock(item.id, item.quantidade + 1)}
                      >
                        <MaterialIcon icon="add" />
                      </Button>

                      <Dialog open={isDialogOpen && editItem?.id === item.id} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditItem(item)
                              setIsDialogOpen(true)
                            }}
                          >
                            <MaterialIcon icon="edit" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Item</DialogTitle>
                            <DialogDescription>Atualize as informações do item de estoque</DialogDescription>
                          </DialogHeader>
                          {editItem && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Input
                                  value={editItem.tipo}
                                  onChange={(e) => setEditItem({ ...editItem, tipo: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Peso</Label>
                                <Input
                                  value={editItem.peso}
                                  onChange={(e) => setEditItem({ ...editItem, peso: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Quantidade</Label>
                                <Input
                                  type="number"
                                  value={editItem.quantidade}
                                  onChange={(e) =>
                                    setEditItem({ ...editItem, quantidade: Number.parseInt(e.target.value) })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Estoque Mínimo</Label>
                                <Input
                                  type="number"
                                  value={editItem.minimo}
                                  onChange={(e) =>
                                    setEditItem({ ...editItem, minimo: Number.parseInt(e.target.value) })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Preço (Kz)</Label>
                                <Input
                                  type="number"
                                  value={editItem.preco}
                                  onChange={(e) =>
                                    setEditItem({ ...editItem, preco: Number.parseFloat(e.target.value) })
                                  }
                                />
                              </div>
                            </div>
                          )}
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleSaveEdit}>Salvar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
