"use client"

import { useState, useEffect, useRef } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MaterialIcon } from "@/components/material-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useWebSocket } from "@/lib/websocket-context"

interface SupportTicket {
  id: string
  assunto: string
  mensagem: string
  data: string
  status: "aberto" | "em_andamento" | "respondido" | "fechado"
  prioridade: "baixa" | "media" | "alta" | "urgente"
  categoria: "tecnico" | "financeiro" | "operacional" | "outro"
  resposta?: string
  anexos?: string[]
  ultimaAtualizacao: string
}

interface ChatMessage {
  id: string
  ticketId: string
  remetente: "usuario" | "suporte"
  nomeRemetente: string
  mensagem: string
  timestamp: Date
  lida: boolean
}

export default function SuportePage() {
  const { toast } = useToast()
  const { isConnected, sendMessage: sendWebSocketMessage } = useWebSocket()
  const [activeTab, setActiveTab] = useState<"tickets" | "chat" | "faq">("tickets")
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: "1",
      assunto: "Problema com sincronização de pedidos",
      mensagem: "Os pedidos não estão aparecendo em tempo real. Como posso resolver?",
      data: "2025-02-09",
      status: "respondido",
      prioridade: "alta",
      categoria: "tecnico",
      resposta:
        "Olá! Verifique se sua conexão com a internet está estável. Se o problema persistir, tente fazer logout e login novamente.",
      ultimaAtualizacao: "2025-02-09T14:30:00",
    },
    {
      id: "2",
      assunto: "Dúvida sobre relatórios",
      mensagem: "Como exporto os relatórios em PDF?",
      data: "2025-02-08",
      status: "fechado",
      prioridade: "baixa",
      categoria: "operacional",
      resposta: "Você pode exportar clicando no botão 'Exportar PDF' na página de relatórios.",
      ultimaAtualizacao: "2025-02-08T16:45:00",
    },
  ])

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      ticketId: "1",
      remetente: "usuario",
      nomeRemetente: "Você",
      mensagem: "Os pedidos não estão aparecendo em tempo real. Como posso resolver?",
      timestamp: new Date("2025-02-09T10:00:00"),
      lida: true,
    },
    {
      id: "2",
      ticketId: "1",
      remetente: "suporte",
      nomeRemetente: "Agente Maria",
      mensagem:
        "Olá! Verifique se sua conexão com a internet está estável. Se o problema persistir, tente fazer logout e login novamente.",
      timestamp: new Date("2025-02-09T10:15:00"),
      lida: true,
    },
    {
      id: "3",
      ticketId: "1",
      remetente: "usuario",
      nomeRemetente: "Você",
      mensagem: "Já tentei isso, mas o problema continua.",
      timestamp: new Date("2025-02-09T10:20:00"),
      lida: true,
    },
    {
      id: "4",
      ticketId: "1",
      remetente: "suporte",
      nomeRemetente: "Agente Maria",
      mensagem: "Vou verificar no sistema. Aguarde um momento.",
      timestamp: new Date("2025-02-09T10:25:00"),
      lida: true,
    },
  ])

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [newTicket, setNewTicket] = useState({
    assunto: "",
    mensagem: "",
    prioridade: "media" as const,
    categoria: "tecnico" as const,
  })
  const [newChatMessage, setNewChatMessage] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Simulate support agent typing
  useEffect(() => {
    if (selectedTicket && selectedTicket.status === "em_andamento") {
      const timeout = setTimeout(() => {
        setIsTyping(true)
        setTimeout(() => {
          setIsTyping(false)
          // Simulate receiving a message
          if (Math.random() > 0.5) {
            const newMsg: ChatMessage = {
              id: Date.now().toString(),
              ticketId: selectedTicket.id,
              remetente: "suporte",
              nomeRemetente: "Agente Maria",
              mensagem: "Estou verificando isso para você. Um momento, por favor.",
              timestamp: new Date(),
              lida: false,
            }
            setChatMessages((prev) => [...prev, newMsg])
            toast({
              title: "Nova mensagem do suporte",
              description: newMsg.mensagem,
            })
          }
        }, 3000)
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [selectedTicket, toast])

  const handleCreateTicket = () => {
    if (!newTicket.assunto || !newTicket.mensagem) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o assunto e a mensagem.",
        variant: "destructive",
      })
      return
    }

    const ticket: SupportTicket = {
      id: Date.now().toString(),
      assunto: newTicket.assunto,
      mensagem: newTicket.mensagem,
      prioridade: newTicket.prioridade,
      categoria: newTicket.categoria,
      data: new Date().toISOString().split("T")[0],
      status: "aberto",
      ultimaAtualizacao: new Date().toISOString(),
      anexos: selectedFile ? [selectedFile.name] : undefined,
    }

    setTickets([ticket, ...tickets])

    // Create initial chat message
    const initialMessage: ChatMessage = {
      id: Date.now().toString(),
      ticketId: ticket.id,
      remetente: "usuario",
      nomeRemetente: "Você",
      mensagem: newTicket.mensagem,
      timestamp: new Date(),
      lida: true,
    }
    setChatMessages((prev) => [...prev, initialMessage])

    // Send WebSocket notification
    if (isConnected) {
      sendWebSocketMessage({
        type: "new_order",
        data: { type: "support_ticket", ticketId: ticket.id },
      })
    }

    toast({
      title: "Ticket criado",
      description: "Sua solicitação foi enviada ao suporte. Responderemos em breve.",
    })

    setNewTicket({ assunto: "", mensagem: "", prioridade: "media", categoria: "tecnico" })
    setSelectedFile(null)
    setActiveTab("chat")
    setSelectedTicket(ticket)
  }

  const handleSendChatMessage = () => {
    if (!newChatMessage.trim() || !selectedTicket) return

    const message: ChatMessage = {
      id: Date.now().toString(),
      ticketId: selectedTicket.id,
      remetente: "usuario",
      nomeRemetente: "Você",
      mensagem: newChatMessage,
      timestamp: new Date(),
      lida: true,
    }

    setChatMessages((prev) => [...prev, message])

    // Update ticket status
    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id ? { ...t, status: "em_andamento", ultimaAtualizacao: new Date().toISOString() } : t,
      ),
    )

    // Send WebSocket message
    if (isConnected) {
      sendWebSocketMessage({
        type: "order_status_changed",
        data: { type: "chat_message", ticketId: selectedTicket.id, message: newChatMessage },
      })
    }

    setNewChatMessage("")
  }

  const handleCloseTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: "fechado", ultimaAtualizacao: new Date().toISOString() } : t,
      ),
    )
    toast({
      title: "Ticket fechado",
      description: "O ticket foi marcado como resolvido.",
    })
  }

  const getStatusConfig = (status: SupportTicket["status"]) => {
    switch (status) {
      case "aberto":
        return { label: "Aberto", variant: "default" as const, icon: "mail" }
      case "em_andamento":
        return { label: "Em Andamento", variant: "secondary" as const, icon: "pending" }
      case "respondido":
        return { label: "Respondido", variant: "outline" as const, icon: "mark_email_read" }
      case "fechado":
        return { label: "Fechado", variant: "outline" as const, icon: "check_circle" }
    }
  }

  const getPrioridadeConfig = (prioridade: SupportTicket["prioridade"]) => {
    switch (prioridade) {
      case "baixa":
        return { label: "Baixa", className: "bg-blue-100 text-blue-800" }
      case "media":
        return { label: "Média", className: "bg-yellow-100 text-yellow-800" }
      case "alta":
        return { label: "Alta", className: "bg-orange-100 text-orange-800" }
      case "urgente":
        return { label: "Urgente", className: "bg-red-100 text-red-800" }
    }
  }

  const getCategoriaIcon = (categoria: SupportTicket["categoria"]) => {
    switch (categoria) {
      case "tecnico":
        return "settings"
      case "financeiro":
        return "payments"
      case "operacional":
        return "business"
      case "outro":
        return "help"
    }
  }

  const ticketsByStatus = {
    aberto: tickets.filter((t) => t.status === "aberto").length,
    em_andamento: tickets.filter((t) => t.status === "em_andamento").length,
    respondido: tickets.filter((t) => t.status === "respondido").length,
    fechado: tickets.filter((t) => t.status === "fechado").length,
  }

  const activeTickets = tickets.filter((t) => t.status !== "fechado")

  return (
    <div className="flex flex-col">
      <AppHeader title="Suporte" />

      <div className="flex-1 space-y-6 p-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tickets Abertos</p>
                  <p className="text-2xl font-bold">{ticketsByStatus.aberto}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <MaterialIcon icon="mail" className="text-2xl text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                  <p className="text-2xl font-bold">{ticketsByStatus.em_andamento}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                  <MaterialIcon icon="pending" className="text-2xl text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Respondidos</p>
                  <p className="text-2xl font-bold">{ticketsByStatus.respondido}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <MaterialIcon icon="mark_email_read" className="text-2xl text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fechados</p>
                  <p className="text-2xl font-bold">{ticketsByStatus.fechado}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-500/10">
                  <MaterialIcon icon="check_circle" className="text-2xl text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tickets" className="gap-2">
              <MaterialIcon icon="confirmation_number" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MaterialIcon icon="chat" />
              Chat ao Vivo
              {activeTickets.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {activeTickets.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <MaterialIcon icon="help" />
              FAQ
            </TabsTrigger>
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Criar Novo Ticket</CardTitle>
                <CardDescription>Descreva sua dúvida ou problema e nossa equipe responderá em breve</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Assunto *</Label>
                    <Input
                      placeholder="Ex: Problema com login"
                      value={newTicket.assunto}
                      onChange={(e) => setNewTicket({ ...newTicket, assunto: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newTicket.categoria}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, categoria: e.target.value as SupportTicket["categoria"] })
                      }
                    >
                      <option value="tecnico">Técnico</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="operacional">Operacional</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prioridade *</Label>
                  <div className="flex gap-2">
                    {(["baixa", "media", "alta", "urgente"] as const).map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={newTicket.prioridade === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewTicket({ ...newTicket, prioridade: p })}
                        className="capitalize"
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem *</Label>
                  <Textarea
                    placeholder="Descreva sua dúvida ou problema em detalhes..."
                    rows={6}
                    value={newTicket.mensagem}
                    onChange={(e) => setNewTicket({ ...newTicket, mensagem: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Anexar Arquivo (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {selectedFile && (
                      <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}>
                        <MaterialIcon icon="close" />
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                <Button onClick={handleCreateTicket}>
                  <MaterialIcon icon="send" className="mr-2" />
                  Criar Ticket
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meus Tickets</CardTitle>
                <CardDescription>Histórico de solicitações e respostas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MaterialIcon icon="support_agent" className="mb-4 text-5xl text-muted-foreground" />
                      <p className="text-muted-foreground">Nenhum ticket criado ainda</p>
                    </div>
                  ) : (
                    tickets.map((ticket) => {
                      const statusConfig = getStatusConfig(ticket.status)
                      const prioridadeConfig = getPrioridadeConfig(ticket.prioridade)
                      return (
                        <div key={ticket.id} className="rounded-lg border border-border bg-card p-4">
                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <MaterialIcon icon={getCategoriaIcon(ticket.categoria)} className="text-lg" />
                                <h3 className="font-semibold">{ticket.assunto}</h3>
                                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                                <Badge className={prioridadeConfig.className}>{prioridadeConfig.label}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Criado em {new Date(ticket.data).toLocaleDateString("pt-AO")} • Atualizado em{" "}
                                {new Date(ticket.ultimaAtualizacao).toLocaleString("pt-AO")}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTicket(ticket)
                                  setActiveTab("chat")
                                }}
                              >
                                <MaterialIcon icon="chat" className="mr-2" />
                                Abrir Chat
                              </Button>
                              {ticket.status !== "fechado" && (
                                <Button variant="ghost" size="sm" onClick={() => handleCloseTicket(ticket.id)}>
                                  <MaterialIcon icon="close" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="rounded-lg bg-muted p-3">
                              <p className="text-sm font-medium text-muted-foreground">Descrição:</p>
                              <p className="mt-1 text-sm">{ticket.mensagem}</p>
                            </div>

                            {ticket.anexos && ticket.anexos.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {ticket.anexos.map((anexo, idx) => (
                                  <Badge key={idx} variant="outline" className="gap-1">
                                    <MaterialIcon icon="attach_file" className="text-sm" />
                                    {anexo}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {ticket.resposta && (
                              <div className="rounded-lg bg-primary/5 p-3">
                                <div className="flex items-center gap-2">
                                  <MaterialIcon icon="support_agent" className="text-primary" />
                                  <p className="text-sm font-medium text-primary">Resposta do Suporte:</p>
                                </div>
                                <p className="mt-1 text-sm">{ticket.resposta}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Ticket List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Conversas Ativas</CardTitle>
                  <CardDescription>{activeTickets.length} ticket(s) ativo(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeTickets.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground">Nenhuma conversa ativa</p>
                    ) : (
                      activeTickets.map((ticket) => {
                        const statusConfig = getStatusConfig(ticket.status)
                        const isSelected = selectedTicket?.id === ticket.id
                        return (
                          <button
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className={cn(
                              "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                              isSelected && "border-primary bg-primary/5",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <MaterialIcon icon={getCategoriaIcon(ticket.categoria)} className="mt-1 text-lg" />
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate font-medium">{ticket.assunto}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge variant={statusConfig.variant} className="text-xs">
                                    {statusConfig.label}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(ticket.ultimaAtualizacao).toLocaleTimeString("pt-AO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chat Window */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  {selectedTicket ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedTicket.assunto}</CardTitle>
                        <CardDescription>Ticket #{selectedTicket.id}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getStatusConfig(selectedTicket.status).variant}>
                          {getStatusConfig(selectedTicket.status).label}
                        </Badge>
                        {selectedTicket.status !== "fechado" && (
                          <Button variant="outline" size="sm" onClick={() => handleCloseTicket(selectedTicket.id)}>
                            <MaterialIcon icon="check" className="mr-2" />
                            Marcar como Resolvido
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <CardTitle>Selecione uma conversa</CardTitle>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedTicket ? (
                    <div className="flex flex-col">
                      {/* Messages */}
                      <div className="mb-4 h-[400px] space-y-4 overflow-y-auto rounded-lg border p-4">
                        {chatMessages
                          .filter((msg) => msg.ticketId === selectedTicket.id)
                          .map((message) => (
                            <div
                              key={message.id}
                              className={cn(
                                "flex gap-3",
                                message.remetente === "usuario" ? "flex-row-reverse" : "flex-row",
                              )}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {message.remetente === "usuario" ? (
                                    <MaterialIcon icon="person" />
                                  ) : (
                                    <MaterialIcon icon="support_agent" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div
                                className={cn(
                                  "max-w-[70%] space-y-1",
                                  message.remetente === "usuario" ? "items-end" : "items-start",
                                )}
                              >
                                <p className="text-xs text-muted-foreground">{message.nomeRemetente}</p>
                                <div
                                  className={cn(
                                    "rounded-lg p-3",
                                    message.remetente === "usuario" ? "bg-primary text-primary-foreground" : "bg-muted",
                                  )}
                                >
                                  <p className="text-sm">{message.mensagem}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {message.timestamp.toLocaleTimeString("pt-AO", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}

                        {isTyping && (
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <MaterialIcon icon="support_agent" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="rounded-lg bg-muted p-3">
                              <div className="flex gap-1">
                                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></span>
                                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div ref={chatEndRef} />
                      </div>

                      {/* Input */}
                      {selectedTicket.status !== "fechado" && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Digite sua mensagem..."
                            value={newChatMessage}
                            onChange={(e) => setNewChatMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSendChatMessage()
                              }
                            }}
                          />
                          <Button onClick={handleSendChatMessage} disabled={!newChatMessage.trim()}>
                            <MaterialIcon icon="send" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-[400px] flex-col items-center justify-center text-center">
                      <MaterialIcon icon="chat_bubble_outline" className="mb-4 text-5xl text-muted-foreground" />
                      <p className="text-muted-foreground">Selecione um ticket para iniciar a conversa</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Frequentes</CardTitle>
                <CardDescription>Respostas rápidas para dúvidas comuns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      categoria: "Pedidos",
                      icon: "shopping_cart",
                      perguntas: [
                        {
                          pergunta: "Como aceito pedidos em tempo real?",
                          resposta:
                            "Os pedidos aparecem automaticamente na página Pedidos. Clique em 'Aceitar' ou 'Encaminhar' para processar.",
                        },
                        {
                          pergunta: "Como encaminho um pedido para um entregador?",
                          resposta:
                            "Após aceitar o pedido, clique no botão de encaminhar e selecione o entregador disponível.",
                        },
                      ],
                    },
                    {
                      categoria: "Funcionários",
                      icon: "people",
                      perguntas: [
                        {
                          pergunta: "Como adiciono um novo funcionário?",
                          resposta: "Acesse a página Funcionários e clique em 'Adicionar Funcionário'.",
                        },
                        {
                          pergunta: "Como gerencio permissões de acesso?",
                          resposta:
                            "Na edição do funcionário, vá até a aba 'Acessos' e selecione as permissões desejadas.",
                        },
                      ],
                    },
                    {
                      categoria: "Relatórios",
                      icon: "assessment",
                      perguntas: [
                        {
                          pergunta: "Como visualizo relatórios de um período específico?",
                          resposta: "Na página Relatórios, use os filtros de data para selecionar o período desejado.",
                        },
                        {
                          pergunta: "Como exporto relatórios?",
                          resposta: "Clique no botão 'Exportar' e escolha entre PDF ou CSV.",
                        },
                      ],
                    },
                    {
                      categoria: "Configurações",
                      icon: "settings",
                      perguntas: [
                        {
                          pergunta: "Como altero os preços dos produtos?",
                          resposta: "Vá em Configurações > Gestão de Preços e atualize os valores.",
                        },
                        {
                          pergunta: "Como configuro notificações?",
                          resposta:
                            "Acesse seu perfil e na seção de notificações, ative ou desative conforme preferir.",
                        },
                      ],
                    },
                  ].map((secao, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <MaterialIcon icon={secao.icon} className="text-primary" />
                        <h3 className="font-semibold">{secao.categoria}</h3>
                      </div>
                      {secao.perguntas.map((faq, idx) => (
                        <div key={idx} className="ml-8 rounded-lg border border-border p-4">
                          <h4 className="mb-2 font-semibold">{faq.pergunta}</h4>
                          <p className="text-sm text-muted-foreground">{faq.resposta}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
