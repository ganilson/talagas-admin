"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { LargeModalWithTabs } from "@/components/large-modal-with-tabs"
import { validateAngolaPhone, validateEmail } from "@/lib/angola-validations"
import { getCargosToFuncionario, type CargoItem } from "@/lib/cargos"
import {
  listarFuncionarios,
  criarFuncionario,
  atualizarFuncionario,
  removerFuncionario,
  type Funcionario,
  type FuncionarioPayload,
} from "@/lib/funcionarios"
import { getStoredUser } from "@/lib/auth"

interface EmployeeUI {
  id: string
  nome: string
  sobrenome: string
  email: string
  telefone: string
  cargoId: string
  cargoTitulo: string
  status: "ativo" | "inativo"
  historico?: { data: string; acao: string; usuario: string }[]
}

export default function FuncionariosPage() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<EmployeeUI[]>([])
  const [cargos, setCargos] = useState<CargoItem[]>([])

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<EmployeeUI | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [newEmployee, setNewEmployee] = useState({
    estabelecimentoId: "",
    nome: "",
    sobrenome: "",
    email: "",
    telefone: "",
    genero: "",
    endereco: "",
    dataDeNascimento: "",
    cargoId: "",
    fotoPerfil: "",
  })

  const cargoById = useMemo(() => {
    const map = new Map<string, CargoItem>()
    cargos.forEach((c) => map.set(c._id, c))
    return map
  }, [cargos])

  const selectedCargoAccess = useMemo(() => {
    return newEmployee.cargoId ? cargoById.get(newEmployee.cargoId)?.access || [] : []
  }, [newEmployee.cargoId, cargoById])

  const editSelectedCargoAccess = useMemo(() => {
    return editEmployee?.cargoId ? cargoById.get(editEmployee.cargoId)?.access || [] : []
  }, [editEmployee, cargoById])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [cargosResp, funcionariosResp] = await Promise.all([
        getCargosToFuncionario(),
        listarFuncionarios(),
      ])
      setCargos(cargosResp)

      const mapped: EmployeeUI[] = funcionariosResp.map((f: Funcionario) => ({
        id: f._id,
        nome: f.usuarioId?.nome || "",
        sobrenome: f.usuarioId?.sobrenome || "",
        email: f.usuarioId?.email || "",
        telefone: f.usuarioId?.telefone || "",
        cargoId: f.cargoId?._id || "",
        cargoTitulo: f.cargoId?.titulo || "",
        status: f.isActive === false ? "inativo" : "ativo",
      }))

      setEmployees(mapped)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar dados"
      toast({ title: "Erro", description: message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const user = getStoredUser()
    const estabelecimentoId = (user?.estabelecimentoId || (user as any)?.user?.estabelecimentoId || "").toString()
    setNewEmployee((prev) => ({ ...prev, estabelecimentoId: estabelecimentoId }))
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validateEmployeeForm = (data: typeof newEmployee): boolean => {
    const newErrors: Record<string, string> = {}

    if (!data.estabelecimentoId.trim()) {
      newErrors.dados = "Estabelecimento é obrigatório"
      newErrors.estabelecimentoId = "Estabelecimento é obrigatório"
    }

    if (!data.nome.trim()) {
      newErrors.dados = "Nome é obrigatório"
      newErrors.nome = "Nome é obrigatório"
    }

    if (!data.sobrenome.trim()) {
      newErrors.dados = "Sobrenome é obrigatório"
      newErrors.sobrenome = "Sobrenome é obrigatório"
    }

    if (!validateEmail(data.email)) {
      newErrors.dados = "Email inválido"
      newErrors.email = "Email inválido"
    }

    if (!data.cargoId) {
      newErrors.dados = "Cargo é obrigatório"
      newErrors.cargoId = "Cargo é obrigatório"
    }

    if (!validateAngolaPhone(data.telefone)) {
      newErrors.dados = "Telefone inválido. Use o formato: +244 9XXXXXXXX"
      newErrors.telefone = "Telefone inválido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddEmployee = async () => {
    if (!validateEmployeeForm(newEmployee)) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const payload: FuncionarioPayload = {
        estabelecimentoId: newEmployee.estabelecimentoId,
        cargoId: newEmployee.cargoId,
        nome: newEmployee.nome,
        sobrenome: newEmployee.sobrenome,
        telefone: newEmployee.telefone,
        email: newEmployee.email,
        endereco: newEmployee.endereco || undefined,
        genero: newEmployee.genero || undefined,
        dataDeNascimento: newEmployee.dataDeNascimento || undefined,
        fotoPerfil: newEmployee.fotoPerfil || undefined,
      }

      const criado = await criarFuncionario(payload)

      toast({
        title: "Funcionário cadastrado!",
        description: `${criado.nome} ${criado.sobrenome} foi adicionado com sucesso.`,
      })

      await loadData()
      setIsAddModalOpen(false)
      setNewEmployee({
        estabelecimentoId: "",
        nome: "",
        sobrenome: "",
        email: "",
        telefone: "",
        genero: "",
        endereco: "",
        dataDeNascimento: "",
        cargoId: "",
        fotoPerfil: "",
      })
      setErrors({})
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar funcionário"
      toast({ title: "Erro", description: message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateEmployee = async () => {
    if (!editEmployee) return

    const toValidate = {
      estabelecimentoId: newEmployee.estabelecimentoId || "temp",
      nome: editEmployee.nome,
      sobrenome: editEmployee.sobrenome,
      email: editEmployee.email,
      telefone: editEmployee.telefone,
      genero: "",
      endereco: "",
      dataDeNascimento: "",
      cargoId: editEmployee.cargoId,
      fotoPerfil: "",
    }

    if (!validateEmployeeForm(toValidate)) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const payload: Partial<FuncionarioPayload> = {
        cargoId: editEmployee.cargoId,
        nome: editEmployee.nome,
        sobrenome: editEmployee.sobrenome,
        telefone: editEmployee.telefone,
        email: editEmployee.email,
      }
      await atualizarFuncionario(editEmployee.id, payload)
      toast({ title: "Funcionário atualizado", description: "As informações foram salvas com sucesso." })
      await loadData()
      setIsEditModalOpen(false)
      setEditEmployee(null)
      setErrors({})
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar funcionário"
      toast({ title: "Erro", description: message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    try {
      await removerFuncionario(id)
      toast({ title: "Funcionário removido", description: "O funcionário foi removido do sistema." })
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao remover funcionário"
      toast({ title: "Erro", description: message, variant: "destructive" })
    }
  }

  const empresasDisponiveis = ["TalaGás Luanda", "TalaGás Viana", "TalaGás Talatona", "TalaGás Morro Bento"]

  const addEmployeeTabs = [
    {
      id: "dados",
      label: "Dados Pessoais",
      icon: "person",
      content: (
        <div className="space-y-4">
          {/* estabelecimentoId preenchido automaticamente pelo login; não exibido */}
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={newEmployee.nome}
              onChange={(e) => setNewEmployee({ ...newEmployee, nome: e.target.value })}
              placeholder="Ex: João"
              className={errors.nome ? "border-destructive" : ""}
            />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
          </div>
          <div className="space-y-2">
            <Label>Sobrenome *</Label>
            <Input
              value={newEmployee.sobrenome}
              onChange={(e) => setNewEmployee({ ...newEmployee, sobrenome: e.target.value })}
              placeholder="Ex: Silva"
              className={errors.sobrenome ? "border-destructive" : ""}
            />
            {errors.sobrenome && <p className="text-sm text-destructive">{errors.sobrenome}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={newEmployee.email}
              onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              placeholder="joao@email.com"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label>Telefone * (+244)</Label>
            <Input
              value={newEmployee.telefone}
              onChange={(e) => setNewEmployee({ ...newEmployee, telefone: e.target.value })}
              placeholder="+244 923 456 789"
              className={errors.telefone ? "border-destructive" : ""}
            />
            {errors.telefone && <p className="text-sm text-destructive">{errors.telefone}</p>}
          </div>
          <div className="space-y-2">
            <Label>Cargo *</Label>
            <Select value={newEmployee.cargoId} onValueChange={(value) => setNewEmployee({ ...newEmployee, cargoId: value })}>
              <SelectTrigger className={errors.cargoId ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                {cargos.map((cargo) => (
                  <SelectItem key={cargo._id} value={cargo._id}>
                    {cargo.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cargoId && <p className="text-sm text-destructive">{errors.cargoId}</p>}
          </div>
          {selectedCargoAccess.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">Páginas com acesso pelo cargo</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selectedCargoAccess.map((a) => (
                  <div key={a._id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MaterialIcon icon={a.icon} className="text-primary" />
                    <span>{a.PageName}</span>
                    <span className="ml-auto rounded bg-muted px-2 py-0.5 text-xs">{a.Route}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "vinculos",
      label: "Vínculos",
      icon: "business",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Selecione as empresas às quais o funcionário terá acesso</p>
          <div className="space-y-2">
            {empresasDisponiveis.map((empresa) => (
              <div key={empresa} className="flex items-center space-x-3 rounded-lg border p-4">
                <Checkbox id={`add-empresa-${empresa}`} checked={false} onCheckedChange={() => {}} />
                <label htmlFor={`add-empresa-${empresa}`} className="flex-1 font-medium">
                  {empresa}
                </label>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  const editEmployeeTabs = editEmployee
    ? [
        {
          id: "dados",
          label: "Dados Pessoais",
          icon: "person",
          content: (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={editEmployee.nome}
                  onChange={(e) => setEditEmployee({ ...editEmployee, nome: e.target.value })}
                  className={errors.nome ? "border-destructive" : ""}
                />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
              </div>
              <div className="space-y-2">
                <Label>Sobrenome *</Label>
                <Input
                  value={editEmployee.sobrenome}
                  onChange={(e) => setEditEmployee({ ...editEmployee, sobrenome: e.target.value })}
                  className={errors.sobrenome ? "border-destructive" : ""}
                />
                {errors.sobrenome && <p className="text-sm text-destructive">{errors.sobrenome}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editEmployee.email}
                  onChange={(e) => setEditEmployee({ ...editEmployee, email: e.target.value })}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label>Telefone * (+244)</Label>
                <Input
                  value={editEmployee.telefone}
                  onChange={(e) => setEditEmployee({ ...editEmployee, telefone: e.target.value })}
                  className={errors.telefone ? "border-destructive" : ""}
                />
                {errors.telefone && <p className="text-sm text-destructive">{errors.telefone}</p>}
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select
                  value={editEmployee.cargoId}
                  onValueChange={(value) =>
                    setEditEmployee({ ...editEmployee, cargoId: value, cargoTitulo: cargoById.get(value)?.titulo || "" })
                  }
                >
                  <SelectTrigger className={errors.cargoId ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cargos.map((cargo) => (
                      <SelectItem key={cargo._id} value={cargo._id}>
                        {cargo.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cargoId && <p className="text-sm text-destructive">{errors.cargoId}</p>}
              </div>
              {editSelectedCargoAccess.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-medium">Páginas com acesso pelo cargo</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {editSelectedCargoAccess.map((a) => (
                      <div key={a._id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MaterialIcon icon={a.icon} className="text-primary" />
                        <span>{a.PageName}</span>
                        <span className="ml-auto rounded bg-muted px-2 py-0.5 text-xs">{a.Route}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        },
        {
          id: "vinculos",
          label: "Vínculos",
          icon: "business",
          content: (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Gerencie os vínculos do funcionário com as empresas</p>
              <div className="space-y-2">
                {empresasDisponiveis.map((empresa) => (
                  <div key={empresa} className="flex items-center space-x-3 rounded-lg border p-4">
                    <Checkbox id={`edit-empresa-${empresa}`} checked={false} onCheckedChange={() => {}} />
                    <label htmlFor={`edit-empresa-${empresa}`} className="flex-1 font-medium">
                      {empresa}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          id: "historico",
          label: "Histórico",
          icon: "history",
          content: (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Histórico de ações e alterações</p>
              <div className="space-y-3">
                {editEmployee.historico && editEmployee.historico.length > 0 ? (
                  editEmployee.historico.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg border p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <MaterialIcon icon="event" className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.acao}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.data).toLocaleDateString("pt-AO")} • Por {item.usuario}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground">Nenhum histórico disponível</p>
                )}
              </div>
            </div>
          ),
        },
      ]
    : []

  return (
    <div className="flex flex-col">
      <AppHeader title="Funcionários" />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Gerenciar Funcionários</h2>
            <p className="text-muted-foreground">
              {isLoading ? "Carregando..." : `Total de ${employees.length} funcionários cadastrados`}
            </p>
          </div>

          <Button onClick={() => setIsAddModalOpen(true)}>
            <MaterialIcon icon="person_add" className="mr-2" />
            Adicionar Funcionário
          </Button>
        </div>

        <LargeModalWithTabs
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          title="Novo Funcionário"
          description="Preencha os dados do novo funcionário"
          tabs={addEmployeeTabs}
          onSave={handleAddEmployee}
          onCancel={() => {
            setIsAddModalOpen(false)
            setErrors({})
          }}
          isLoading={isLoading}
          errors={errors}
        />

        <LargeModalWithTabs
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          title="Editar Funcionário"
          description="Atualize as informações"
          tabs={editEmployeeTabs}
          onSave={handleUpdateEmployee}
          onCancel={() => {
            setIsEditModalOpen(false)
            setErrors({})
          }}
          isLoading={isLoading}
          errors={errors}
        />

        <div className="grid gap-4">
          {employees.map((employee) => (
            <Card key={employee.id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <MaterialIcon icon="person" className="text-2xl text-primary" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{employee.nome} {employee.sobrenome}</h3>
                      <Badge variant={employee.status === "ativo" ? "default" : "secondary"}>{employee.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MaterialIcon icon="badge" className="text-base" />
                        {employee.cargoTitulo || cargoById.get(employee.cargoId)?.titulo || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MaterialIcon icon="email" className="text-base" />
                        {employee.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <MaterialIcon icon="phone" className="text-base" />
                        {employee.telefone}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditEmployee(employee)
                        setIsEditModalOpen(true)
                      }}
                    >
                      <MaterialIcon icon="edit" />
                    </Button>

                    <Button variant="outline" size="icon" onClick={() => handleDeleteEmployee(employee.id)}>
                      <MaterialIcon icon="delete" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
