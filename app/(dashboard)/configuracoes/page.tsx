"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

export default function ConfiguracoesPage() {
  const { toast } = useToast()

  const [companyData, setCompanyData] = useState({
    nome: "GasViana Ltda",
    nif: "0192312342",
    endereco: "Rua Principal, 1000",
    cidade: "Luanda",
    estado: "SP",
    telefone: "+244 946801111",
    email: "contato@GasViana.com",
  })

  const [pricing, setPricing] = useState({
    botijao6kg: 65,
    botijao13kg: 95,
    botijao20kg: 135,
    botijao45kg: 280,
    taxaEntrega: 10,
  })

  const [adminAccount, setAdminAccount] = useState({
    nome: "Ganilson",
    email: "ganilson@GasViana.com",
    cargo: "Gerente",
  })

  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSaveCompanyData = () => {
    toast({
      title: "Dados salvos",
      description: "As informações da empresa foram atualizadas.",
    })
  }

  const handleSavePricing = () => {
    toast({
      title: "Preços atualizados",
      description: "A tabela de preços foi atualizada com sucesso.",
    })
  }

  const handleSaveAccount = () => {
    toast({
      title: "Conta atualizada",
      description: "Suas informações foram salvas.",
    })
  }

  const handleChangePassword = () => {
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Senha alterada",
      description: "Sua senha foi atualizada com sucesso.",
    })

    setPasswordChange({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Configurações" />

      <div className="flex-1 space-y-6 p-6">
        {/* Company Data */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>Informações cadastrais da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <Input
                  value={companyData.nome}
                  onChange={(e) => setCompanyData({ ...companyData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>NIF</Label>
                <Input
                  value={companyData.nif}
                  onChange={(e) => setCompanyData({ ...companyData, nif: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={companyData.endereco}
                  onChange={(e) => setCompanyData({ ...companyData, endereco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={companyData.cidade}
                  onChange={(e) => setCompanyData({ ...companyData, cidade: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={companyData.telefone}
                  onChange={(e) => setCompanyData({ ...companyData, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={companyData.email}
                  onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleSaveCompanyData}>
              <MaterialIcon icon="save" className="mr-2" />
              Salvar Dados
            </Button>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Preços</CardTitle>
            <CardDescription>Configure os preços dos produtos e serviços</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Botijão 6kg</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Preço</span>
                  <Input
                    type="number"
                    value={pricing.botijao6kg}
                    onChange={(e) => setPricing({ ...pricing, botijao6kg: Number.parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Botijão 13kg</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Preço</span>
                  <Input
                    type="number"
                    value={pricing.botijao13kg}
                    onChange={(e) => setPricing({ ...pricing, botijao13kg: Number.parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Botijão 20kg</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Preço</span>
                  <Input
                    type="number"
                    value={pricing.botijao20kg}
                    onChange={(e) => setPricing({ ...pricing, botijao20kg: Number.parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Botijão 45kg</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Preço</span>
                  <Input
                    type="number"
                    value={pricing.botijao45kg}
                    onChange={(e) => setPricing({ ...pricing, botijao45kg: Number.parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taxa de Entrega</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Preço</span>
                  <Input
                    type="number"
                    value={pricing.taxaEntrega}
                    onChange={(e) => setPricing({ ...pricing, taxaEntrega: Number.parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleSavePricing}>
              <MaterialIcon icon="save" className="mr-2" />
              Salvar Preços
            </Button>
          </CardContent>
        </Card>

        {/* Admin Account */}
        <Card>
          <CardHeader>
            <CardTitle>Conta do Administrador</CardTitle>
            <CardDescription>Gerencie suas informações pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={adminAccount.nome}
                  onChange={(e) => setAdminAccount({ ...adminAccount, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={adminAccount.email}
                  onChange={(e) => setAdminAccount({ ...adminAccount, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={adminAccount.cargo}
                  onChange={(e) => setAdminAccount({ ...adminAccount, cargo: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleSaveAccount}>
              <MaterialIcon icon="save" className="mr-2" />
              Salvar Conta
            </Button>

            <Separator className="my-6" />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Alterar Senha</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input
                    type="password"
                    value={passwordChange.currentPassword}
                    onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    value={passwordChange.newPassword}
                    onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    value={passwordChange.confirmPassword}
                    onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleChangePassword}>
                <MaterialIcon icon="lock" className="mr-2" />
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
