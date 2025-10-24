"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getStoredUser, storeUser, type UserData } from "@/lib/auth"
import { validateAngolaPhone, validateNIF, formatNIF, validateEmail } from "@/lib/angola-validations"

interface ProfileData {
  nome: string
  email: string
  telefone: string
  nif: string
  morada: string
  bairro: string
  cidade: string
  avatar?: string
}

export default function PerfilPage() {
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [profileData, setProfileData] = useState<ProfileData>({
    nome: "",
    email: "",
    telefone: "",
    nif: "",
    morada: "",
    bairro: "",
    cidade: "Luanda",
    avatar: undefined,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({})
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      setUserData(user)
      setProfileData({
        nome: user.user.nome,
        email: "admin@talagas.com",
        telefone: "+244 946 808 051",
        nif: "123 456 789",
        morada: "Rua Principal, Edifício TalaGás",
        bairro: "Talatona",
        cidade: "Luanda",
        avatar: undefined,
      })
    }
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileData, string>> = {}

    if (!profileData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório"
    }

    if (!validateEmail(profileData.email)) {
      newErrors.email = "Email inválido"
    }

    if (!validateAngolaPhone(profileData.telefone)) {
      newErrors.telefone = "Telefone inválido. Use o formato: +244 9XXXXXXXX"
    }

    if (profileData.nif && !validateNIF(profileData.nif.replace(/\s/g, ""))) {
      newErrors.nif = "NIF inválido. Deve conter 9 dígitos"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      })
      return
    }

    if (userData) {
      const updatedUser = {
        ...userData,
        user: {
          ...userData.user,
          nome: profileData.nome,
        },
      }
      setUserData(updatedUser)
      storeUser(updatedUser)

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      })
      setIsEditing(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    setProfileData({ ...profileData, telefone: value })
    if (errors.telefone) {
      setErrors({ ...errors, telefone: undefined })
    }
  }

  const handleNIFChange = (value: string) => {
    const cleaned = value.replace(/\s/g, "")
    if (cleaned.length <= 9 && /^\d*$/.test(cleaned)) {
      setProfileData({ ...profileData, nif: formatNIF(cleaned) })
      if (errors.nif) {
        setErrors({ ...errors, nif: undefined })
      }
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileData({ ...profileData, avatar: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Senha alterada!",
      description: "Sua senha foi atualizada com sucesso.",
    })

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setIsPasswordDialogOpen(false)
  }

  if (!userData) {
    return (
      <div className="flex flex-col">
        <AppHeader title="Perfil" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Perfil" />

      <div className="flex-1 space-y-6 p-6">
        {/* Profile Header with Avatar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className="relative">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                  {profileData.avatar ? (
                    <img
                      src={profileData.avatar || "/placeholder.svg"}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <MaterialIcon icon="person" className="text-6xl text-primary" />
                  )}
                </div>
                {isEditing && (
                  <>
                    <Button
                      size="icon"
                      className="absolute bottom-0 right-0 h-10 w-10 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <MaterialIcon icon="photo_camera" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold">{profileData.nome}</h2>
                <p className="text-muted-foreground">{profileData.email}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
                  <Badge>{userData.user.cargo.titulo}</Badge>
                  {profileData.telefone && (
                    <Badge variant="outline">
                      <MaterialIcon icon="phone" className="mr-1 text-sm" />
                      {profileData.telefone}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <MaterialIcon icon="edit" className="mr-2" />
                    Editar Perfil
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      <MaterialIcon icon="save" className="mr-2" />
                      Salvar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MaterialIcon icon="person" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                {isEditing ? (
                  <>
                    <Input
                      value={profileData.nome}
                      onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
                      className={errors.nome ? "border-destructive" : ""}
                    />
                    {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
                  </>
                ) : (
                  <p className="font-medium">{profileData.nome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                {isEditing ? (
                  <>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </>
                ) : (
                  <p className="font-medium">{profileData.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Telefone * (+244)</Label>
                {isEditing ? (
                  <>
                    <Input
                      value={profileData.telefone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="+244 946 808 051"
                      className={errors.telefone ? "border-destructive" : ""}
                    />
                    {errors.telefone && <p className="text-sm text-destructive">{errors.telefone}</p>}
                  </>
                ) : (
                  <p className="font-medium">{profileData.telefone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>NIF (Número de Identificação Fiscal)</Label>
                {isEditing ? (
                  <>
                    <Input
                      value={profileData.nif}
                      onChange={(e) => handleNIFChange(e.target.value)}
                      placeholder="123 456 789"
                      className={errors.nif ? "border-destructive" : ""}
                    />
                    {errors.nif && <p className="text-sm text-destructive">{errors.nif}</p>}
                  </>
                ) : (
                  <p className="font-medium">{profileData.nif || "Não informado"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MaterialIcon icon="location_on" />
              Morada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Endereço</Label>
                {isEditing ? (
                  <Textarea
                    value={profileData.morada}
                    onChange={(e) => setProfileData({ ...profileData, morada: e.target.value })}
                    placeholder="Rua, número, edifício..."
                    rows={2}
                  />
                ) : (
                  <p className="font-medium">{profileData.morada || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Bairro</Label>
                {isEditing ? (
                  <Input
                    value={profileData.bairro}
                    onChange={(e) => setProfileData({ ...profileData, bairro: e.target.value })}
                    placeholder="Ex: Talatona"
                  />
                ) : (
                  <p className="font-medium">{profileData.bairro || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                {isEditing ? (
                  <Input
                    value={profileData.cidade}
                    onChange={(e) => setProfileData({ ...profileData, cidade: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{profileData.cidade}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MaterialIcon icon="security" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Senha</p>
                <p className="text-sm text-muted-foreground">Altere sua senha regularmente para maior segurança</p>
              </div>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
                <MaterialIcon icon="lock" className="mr-2" />
                Alterar Senha
              </Button>
            </div>

            {isPasswordDialogOpen && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleChangePassword}>Alterar Senha</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MaterialIcon icon="verified_user" />
              Permissões de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {userData.user.cargo.access.map((item) => (
                <div key={item.Route} className="flex items-center gap-2 rounded-lg border p-3">
                  <MaterialIcon icon={item.icon} className="text-primary" />
                  <span className="font-medium">{item.PageName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
