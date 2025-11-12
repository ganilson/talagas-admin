"use client"

import { useEffect, useState, useRef } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api"

type Transportador = {
  _id: string
  nome: string
  sobrenome: string
  telefone: string
  email: string
  endereco: string
  genero: string
  dataDeNascimento: string
  fotoUrl?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

const GENEROS = ["Masculino", "Feminino", "Outro"]

export default function TransportadoresPage() {
  const { toast } = useToast()
  const [transportadores, setTransportadores] = useState<Transportador[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedTransportador, setSelectedTransportador] = useState<Transportador | null>(null)
  const [editTransportador, setEditTransportador] = useState<Transportador | null>(null)
  const [addForm, setAddForm] = useState({
    nome: "",
    sobrenome: "",
    telefone: "",
    email: "",
    endereco: "",
    genero: "Masculino",
    dataDeNascimento: "",
    foto: null as File | null,
  })
  const [editForm, setEditForm] = useState({
    nome: "",
    sobrenome: "",
    telefone: "",
    email: "",
    endereco: "",
    genero: "Masculino",
    dataDeNascimento: "",
    foto: null as File | null,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // CRUD: GET
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ _id: string }[]>("/empresas/transportadores")
        setTransportadores(res.data || [])
      } catch (err: any) {
        toast({ title: "Erro ao carregar transportadores", description: err?.message ?? String(err), variant: "destructive" })
      }
    })()
  }, [])

  // CRUD: POST
  const handleAddTransportador = async () => {
    try {
      let res;
      // Se tiver foto, usa multipart/form-data
      if (addForm.foto) {
        const formData = new FormData()
        formData.append("nome", addForm.nome)
        formData.append("sobrenome", addForm.sobrenome)
        formData.append("telefone", addForm.telefone)
        formData.append("email", addForm.email)
        formData.append("endereco", addForm.endereco)
        formData.append("genero", addForm.genero)
        formData.append("dataDeNascimento", addForm.dataDeNascimento)
        formData.append("files", addForm.foto)
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"}/empresas/transportadores`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}")?.token || "" : ""}`,
          },
          body: formData,
        })
      } else {
        // Sem arquivo, envia JSON
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"}/empresas/transportadores`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}")?.token || "" : ""}`,
          },
          body: JSON.stringify({
            nome: addForm.nome,
            sobrenome: addForm.sobrenome,
            telefone: addForm.telefone,
            email: addForm.email,
            endereco: addForm.endereco,
            genero: addForm.genero,
            dataDeNascimento: addForm.dataDeNascimento,
          }),
        })
      }
      if (!res.ok) throw new Error("Erro ao cadastrar transportador")
      const novo = await res.json()
      setTransportadores((prev) => [novo.data || novo, ...prev])
      setIsAddDialogOpen(false)
      setAddForm({
        nome: "",
        sobrenome: "",
        telefone: "",
        email: "",
        endereco: "",
        genero: "Masculino",
        dataDeNascimento: "",
        foto: null,
      })
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast({ title: "Transportador cadastrado!" })
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err?.message ?? String(err), variant: "destructive" })
    }
  }

  // CRUD: PUT
  const handleUpdateTransportador = async () => {
    if (!editTransportador) return
    try {
      let res;
      if (editForm.foto) {
        const formData = new FormData()
        formData.append("nome", editForm.nome)
        formData.append("sobrenome", editForm.sobrenome)
        formData.append("telefone", editForm.telefone)
        formData.append("email", editForm.email)
        formData.append("endereco", editForm.endereco)
        formData.append("genero", editForm.genero)
        formData.append("dataDeNascimento", editForm.dataDeNascimento)
        formData.append("files", editForm.foto)
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"}/empresas/transportadores/${editTransportador._id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}")?.token || "" : ""}`,
          },
          body: formData,
        })
      } else {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://talagas-api.onrender.com"}/empresas/transportadores/${editTransportador._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}")?.token || "" : ""}`,
          },
          body: JSON.stringify({
            nome: editForm.nome,
            sobrenome: editForm.sobrenome,
            telefone: editForm.telefone,
            email: editForm.email,
            endereco: editForm.endereco,
            genero: editForm.genero,
            dataDeNascimento: editForm.dataDeNascimento,
          }),
        })
      }
      if (!res.ok) throw new Error("Erro ao atualizar transportador")
      const updated = await res.json()
      setTransportadores((prev) =>
        prev.map((t) => (t._id === editTransportador._id ? (updated.data || updated) : t))
      )
      setIsEditDialogOpen(false)
      setEditTransportador(null)
      if (editFileInputRef.current) editFileInputRef.current.value = ""
      toast({ title: "Transportador atualizado!" })
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err?.message ?? String(err), variant: "destructive" })
    }
  }

  // CRUD: DELETE
  const handleDeleteTransportador = async (id: string) => {
    try {
      await apiFetch(`/empresas/transportadores/${id}`, { method: "DELETE" })
      setTransportadores((prev) => prev.filter((t) => t._id !== id))
      toast({ title: "Transportador removido" })
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err?.message ?? String(err), variant: "destructive" })
    }
  }

  // Modal: abrir detalhes
  const openDetails = (t: Transportador) => {
    setSelectedTransportador(t)
    setIsDetailsDialogOpen(true)
  }

  // Modal: abrir edição
  const openEdit = (t: Transportador) => {
    setEditTransportador(t)
    setEditForm({
      nome: t.nome,
      sobrenome: t.sobrenome,
      telefone: t.telefone,
      email: t.email,
      endereco: t.endereco,
      genero: t.genero,
      dataDeNascimento: t.dataDeNascimento?.slice(0, 10) || "",
      foto: null,
    })
    setIsEditDialogOpen(true)
  }

  // Filtro
  const filtered = transportadores.filter((t) =>
    (t.nome + " " + t.sobrenome + " " + t.telefone + " " + t.email)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  // Mock para detalhes
  const mockCorridas = 128
  const mockFaturado = 2350000

  return (
    <div className="flex flex-col">
      <AppHeader title="Transportadores" />

      <div className="flex-1 space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Transportadores</p>
                  <p className="text-2xl font-bold">{transportadores.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MaterialIcon icon="local_shipping" className="text-2xl text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{transportadores.filter(t => t.isActive !== false).length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <MaterialIcon icon="check_circle" className="text-2xl text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-bold">{transportadores.filter(t => t.isActive === false).length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-500/10">
                  <MaterialIcon icon="pause_circle" className="text-2xl text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e ações */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <MaterialIcon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <MaterialIcon icon="person_add" className="mr-2" />
                Adicionar Transportador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Transportador</DialogTitle>
                <DialogDescription>Preencha os dados do novo transportador</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={addForm.nome} onChange={e => setAddForm(f => ({ ...f, nome: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sobrenome</Label>
                    <Input value={addForm.sobrenome} onChange={e => setAddForm(f => ({ ...f, sobrenome: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={addForm.telefone} onChange={e => setAddForm(f => ({ ...f, telefone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Textarea value={addForm.endereco} onChange={e => setAddForm(f => ({ ...f, endereco: e.target.value }))} rows={2} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Select value={addForm.genero} onValueChange={value => setAddForm(f => ({ ...f, genero: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENEROS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={addForm.dataDeNascimento} onChange={e => setAddForm(f => ({ ...f, dataDeNascimento: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Foto</Label>
                  <Input type="file" accept="image/*" ref={fileInputRef} onChange={e => setAddForm(f => ({ ...f, foto: e.target.files?.[0] || null }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddTransportador}>Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de transportadores */}
        <div className="grid gap-4">
          {filtered.map((t) => (
            <Card key={t._id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                    {t.fotoUrl ? (
                      <img src={t.fotoUrl} alt={t.nome} className="h-14 w-14 object-cover rounded-full" />
                    ) : (
                      <MaterialIcon icon="person" className="text-2xl text-primary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{t.nome} {t.sobrenome}</h3>
                          <Badge variant={t.isActive !== false ? "default" : "secondary"}>
                            {t.isActive !== false ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline" className="capitalize">{t.genero}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">{t.email}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <MaterialIcon icon="phone" className="text-base" />
                        <span>{t.telefone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MaterialIcon icon="location_on" className="text-base" />
                        <span>{t.endereco}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MaterialIcon icon="cake" className="text-base" />
                        <span>{t.dataDeNascimento ? new Date(t.dataDeNascimento).toLocaleDateString("pt-AO") : "-"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 lg:flex-col">
                    <Button variant="outline" size="icon" onClick={() => openDetails(t)}>
                      <MaterialIcon icon="visibility" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(t)}>
                      <MaterialIcon icon="edit" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDeleteTransportador(t._id)}>
                      <MaterialIcon icon="delete" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MaterialIcon icon="search_off" className="mb-4 text-5xl text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Nenhum transportador encontrado</h3>
                <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Detalhes */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Transportador</DialogTitle>
          </DialogHeader>
          {selectedTransportador && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  {selectedTransportador.fotoUrl ? (
                    <img src={selectedTransportador.fotoUrl} alt={selectedTransportador.nome} className="h-20 w-20 object-cover" />
                  ) : (
                    <MaterialIcon icon="person" className="text-4xl text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedTransportador.nome} {selectedTransportador.sobrenome}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={selectedTransportador.isActive !== false ? "default" : "secondary"}>
                      {selectedTransportador.isActive !== false ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline" className="capitalize">{selectedTransportador.genero}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Email</Label>
                  <div>{selectedTransportador.email}</div>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <div>{selectedTransportador.telefone}</div>
                </div>
                <div>
                  <Label>Endereço</Label>
                  <div>{selectedTransportador.endereco}</div>
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <div>{selectedTransportador.dataDeNascimento ? new Date(selectedTransportador.dataDeNascimento).toLocaleDateString("pt-AO") : "-"}</div>
                </div>
              </div>
              {/* Mock info */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                  <div className="text-2xl font-bold">{mockCorridas}</div>
                  <div className="text-xs text-muted-foreground">Corridas Realizadas</div>
                </div>
                <div className="rounded-lg bg-green-100 p-4 text-center">
                  <div className="text-2xl font-bold">Kz {mockFaturado.toLocaleString("pt-AO")}</div>
                  <div className="text-xs text-muted-foreground">Total Faturado</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Transportador</DialogTitle>
            <DialogDescription>Atualize as informações do transportador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sobrenome</Label>
                <Input value={editForm.sobrenome} onChange={e => setEditForm(f => ({ ...f, sobrenome: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={editForm.telefone} onChange={e => setEditForm(f => ({ ...f, telefone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Textarea value={editForm.endereco} onChange={e => setEditForm(f => ({ ...f, endereco: e.target.value }))} rows={2} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select value={editForm.genero} onValueChange={value => setEditForm(f => ({ ...f, genero: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENEROS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={editForm.dataDeNascimento} onChange={e => setEditForm(f => ({ ...f, dataDeNascimento: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Foto</Label>
              <Input type="file" accept="image/*" ref={editFileInputRef} onChange={e => setEditForm(f => ({ ...f, foto: e.target.files?.[0] || null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTransportador}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
