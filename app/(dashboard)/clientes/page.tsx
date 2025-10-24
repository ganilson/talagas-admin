"use client"

import { useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"

interface Customer {
  id: string
  nome: string
  email: string
  telefone: string
  endereco: string
  bairro: string
  cidade: string
  numeroConta: string
  tipoCliente: "residencial" | "comercial" | "industrial"
  status: "ativo" | "inativo" | "inadimplente"
  ultimoPedido?: string
  totalPedidos: number
}

export default function ClientesPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "1",
      nome: "Ana Paula Costa",
      email: "ana.costa@email.com",
      telefone: "+244 946 80 11 11",
      endereco: "Rua das Flores, 123",
      bairro: "Jardim Paulista",
      cidade: "Luanda",
      numeroConta: "GAS-2024-001",
      tipoCliente: "residencial",
      status: "ativo",
      ultimoPedido: "15/01/2025",
      totalPedidos: 24,
    },
    {
      id: "2",
      nome: "Restaurante Sabor Mineiro",
      email: "contato@sabormineiro.com",
      telefone: "+244 946 80 11 11",
      endereco: "Viana, 1500",
      bairro: "Bela Vista",
      cidade: "Luanda",
      numeroConta: "GAS-2024-002",
      tipoCliente: "comercial",
      status: "ativo",
      ultimoPedido: "20/01/2025",
      totalPedidos: 156,
    },
    {
      id: "3",
      nome: "Indústria Metalúrgica Silva",
      email: "compras@metalurgicasilva.com",
      telefone: "+244 946 80 11 11",
      endereco: "Rua Industrial, 890",
      bairro: "Distrito Industrial",
      cidade: "Luanda",
      numeroConta: "GAS-2024-003",
      tipoCliente: "industrial",
      status: "ativo",
      ultimoPedido: "22/01/2025",
      totalPedidos: 89,
    },
    {
      id: "4",
      nome: "Pedro Henrique Santos",
      email: "pedro.santos@email.com",
      telefone: "+244 946 80 11 11",
      endereco: "Rua dos Pinheiros, 456",
      bairro: "Pinheiros",
      cidade: "Luanda",
      numeroConta: "GAS-2024-004",
      tipoCliente: "residencial",
      status: "inadimplente",
      ultimoPedido: "05/12/2024",
      totalPedidos: 12,
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("todos")
  const [filterType, setFilterType] = useState<string>("todos")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)

  const [newCustomer, setNewCustomer] = useState({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    bairro: "",
    cidade: "Luanda",
    tipoCliente: "residencial" as const,
  })

  const handleAddCustomer = () => {
    const customer: Customer = {
      ...newCustomer,
      id: Date.now().toString(),
      numeroConta: `GAS-2024-${String(customers.length + 1).padStart(3, "0")}`,
      status: "ativo",
      totalPedidos: 0,
    }

    setCustomers([...customers, customer])

    toast({
      title: "Cliente cadastrado!",
      description: `${customer.nome} foi adicionado com sucesso.`,
    })

    setIsAddDialogOpen(false)
    setNewCustomer({
      nome: "",
      email: "",
      telefone: "",
      endereco: "",
      bairro: "",
      cidade: "Luanda",
      tipoCliente: "residencial",
    })
  }

  const handleUpdateCustomer = () => {
    if (editCustomer) {
      setCustomers(customers.map((cust) => (cust.id === editCustomer.id ? editCustomer : cust)))
      toast({
        title: "Cliente atualizado",
        description: "As informações foram salvas com sucesso.",
      })
      setIsEditDialogOpen(false)
      setEditCustomer(null)
    }
  }

  const handleDeleteCustomer = (id: string) => {
    const customer = customers.find((c) => c.id === id)
    setCustomers(customers.filter((cust) => cust.id !== id))
    toast({
      title: "Cliente removido",
      description: `${customer?.nome} foi removido do sistema.`,
    })
  }

  const handleToggleStatus = (id: string) => {
    setCustomers(
      customers.map((cust) => {
        if (cust.id === id) {
          const newStatus = cust.status === "ativo" ? "inativo" : "ativo"
          toast({
            title: newStatus === "ativo" ? "Cliente ativado" : "Cliente desativado",
            description: `${cust.nome} foi ${newStatus === "ativo" ? "ativado" : "desativado"} com sucesso.`,
          })
          return { ...cust, status: newStatus }
        }
        return cust
      }),
    )
  }

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.telefone.includes(searchTerm) ||
      customer.numeroConta.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "todos" || customer.status === filterStatus
    const matchesType = filterType === "todos" || customer.tipoCliente === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const stats = {
    total: customers.length,
    ativos: customers.filter((c) => c.status === "ativo").length,
    inativos: customers.filter((c) => c.status === "inativo").length,
    inadimplentes: customers.filter((c) => c.status === "inadimplente").length,
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Clientes" />

      <div className="flex-1 space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MaterialIcon icon="people" className="text-2xl text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
                  <p className="text-2xl font-bold">{stats.ativos}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Clientes Inativos</p>
                  <p className="text-2xl font-bold">{stats.inativos}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-500/10">
                  <MaterialIcon icon="pause_circle" className="text-2xl text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inadimplentes</p>
                  <p className="text-2xl font-bold">{stats.inadimplentes}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <MaterialIcon icon="warning" className="text-2xl text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <MaterialIcon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou conta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
                <SelectItem value="inadimplente">Inadimplentes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="residencial">Residencial</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <MaterialIcon icon="person_add" className="mr-2" />
                Adicionar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
                <DialogDescription>Preencha os dados do novo cliente</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo / Razão Social</Label>
                  <Input
                    value={newCustomer.nome}
                    onChange={(e) => setNewCustomer({ ...newCustomer, nome: e.target.value })}
                    placeholder="Ex: João Silva ou Empresa LTDA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={newCustomer.telefone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, telefone: e.target.value })}
                    placeholder="(11) 98765-4321"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <Select
                    value={newCustomer.tipoCliente}
                    onValueChange={(value: "residencial" | "comercial" | "industrial") =>
                      setNewCustomer({ ...newCustomer, tipoCliente: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residencial">Residencial</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Textarea
                    value={newCustomer.endereco}
                    onChange={(e) => setNewCustomer({ ...newCustomer, endereco: e.target.value })}
                    placeholder="Rua, número, complemento"
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      value={newCustomer.bairro}
                      onChange={(e) => setNewCustomer({ ...newCustomer, bairro: e.target.value })}
                      placeholder="Ex: Centro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={newCustomer.cidade}
                      onChange={(e) => setNewCustomer({ ...newCustomer, cidade: e.target.value })}
                      placeholder="Ex: Luanda"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddCustomer}>Cadastrar Cliente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredCustomers.length} de {customers.length} clientes
        </div>

        {/* Customers List */}
        <div className="grid gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <MaterialIcon
                      icon={
                        customer.tipoCliente === "residencial"
                          ? "home"
                          : customer.tipoCliente === "comercial"
                            ? "store"
                            : "factory"
                      }
                      className="text-2xl text-primary"
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{customer.nome}</h3>
                          <Badge
                            variant={
                              customer.status === "ativo"
                                ? "default"
                                : customer.status === "inadimplente"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {customer.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {customer.tipoCliente}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">Conta: {customer.numeroConta}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <MaterialIcon icon="email" className="text-base" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MaterialIcon icon="phone" className="text-base" />
                        <span>{customer.telefone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MaterialIcon icon="location_on" className="text-base" />
                        <span>
                          {customer.endereco}, {customer.bairro}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MaterialIcon icon="location_city" className="text-base" />
                        <span>{customer.cidade}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <MaterialIcon icon="shopping_bag" className="text-base text-muted-foreground" />
                        <span className="font-medium">{customer.totalPedidos}</span>
                        <span className="text-muted-foreground">pedidos</span>
                      </div>
                      {customer.ultimoPedido && (
                        <div className="flex items-center gap-1">
                          <MaterialIcon icon="schedule" className="text-base text-muted-foreground" />
                          <span className="text-muted-foreground">Último pedido: {customer.ultimoPedido}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 lg:flex-col">
                    <Dialog
                      open={isEditDialogOpen && editCustomer?.id === customer.id}
                      onOpenChange={setIsEditDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditCustomer(customer)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <MaterialIcon icon="edit" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Cliente</DialogTitle>
                          <DialogDescription>Atualize as informações do cliente</DialogDescription>
                        </DialogHeader>
                        {editCustomer && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Nome</Label>
                              <Input
                                value={editCustomer.nome}
                                onChange={(e) => setEditCustomer({ ...editCustomer, nome: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input
                                type="email"
                                value={editCustomer.email}
                                onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Telefone</Label>
                              <Input
                                value={editCustomer.telefone}
                                onChange={(e) => setEditCustomer({ ...editCustomer, telefone: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo de Cliente</Label>
                              <Select
                                value={editCustomer.tipoCliente}
                                onValueChange={(value: "residencial" | "comercial" | "industrial") =>
                                  setEditCustomer({ ...editCustomer, tipoCliente: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="residencial">Residencial</SelectItem>
                                  <SelectItem value="comercial">Comercial</SelectItem>
                                  <SelectItem value="industrial">Industrial</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Select
                                value={editCustomer.status}
                                onValueChange={(value: "ativo" | "inativo" | "inadimplente") =>
                                  setEditCustomer({ ...editCustomer, status: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ativo">Ativo</SelectItem>
                                  <SelectItem value="inativo">Inativo</SelectItem>
                                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Endereço</Label>
                              <Textarea
                                value={editCustomer.endereco}
                                onChange={(e) => setEditCustomer({ ...editCustomer, endereco: e.target.value })}
                                rows={2}
                              />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Bairro</Label>
                                <Input
                                  value={editCustomer.bairro}
                                  onChange={(e) => setEditCustomer({ ...editCustomer, bairro: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Cidade</Label>
                                <Input
                                  value={editCustomer.cidade}
                                  onChange={(e) => setEditCustomer({ ...editCustomer, cidade: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleUpdateCustomer}>Salvar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant={customer.status === "inativo" ? "default" : "outline"}
                      size="icon"
                      onClick={() => handleToggleStatus(customer.id)}
                      title={customer.status === "ativo" ? "Desativar" : "Ativar"}
                    >
                      <MaterialIcon icon={customer.status === "ativo" ? "toggle_on" : "toggle_off"} />
                    </Button>

                    <Button variant="outline" size="icon" onClick={() => handleDeleteCustomer(customer.id)}>
                      <MaterialIcon icon="delete" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredCustomers.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MaterialIcon icon="search_off" className="mb-4 text-5xl text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Nenhum cliente encontrado</h3>
                <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
