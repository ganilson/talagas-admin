"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import JSZip from "jszip"
import QRCode from "qrcode"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogPortal,
  DialogClose,
  DialogOverlay
} from "@/components/ui/dialog"
import "leaflet/dist/leaflet.css"
import * as pontoService from "@/services/pontoService" // novo service

type PontoVenda = {
  id: string
  nome: string
  endereco?: string
  telefone?: string
  lat?: number
  lng?: number
  qrCodeLink?: string
}

const QR_SIZE = 300

export default function DistribuicaoPage() {
  const [pontos, setPontos] = useState<PontoVenda[]>([])
  const { toast } = useToast()
  const markerIconRef = useRef<any>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isListOpen, setIsListOpen] = useState(false)
  const mapMainRef = useRef<HTMLDivElement | null>(null)
  const leafletMainRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const [selectedPoint, setSelectedPoint] = useState<PontoVenda | null>(null)
  const [sideOpen, setSideOpen] = useState(false)
  const [editingSide, setEditingSide] = useState(false)
  const [sideForm, setSideForm] = useState<{ descricao: string; lat?: number; lng?: number }>({ descricao: "", lat: undefined, lng: undefined })

  // Modal / form state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [nome, setNome] = useState("")
  const [endereco, setEndereco] = useState("")
  const [telefone, setTelefone] = useState("")
  const [lat, setLat] = useState<number | undefined>(undefined)
  const [lng, setLng] = useState<number | undefined>(undefined)

  // QR cache for images shown in list
  const [qrCache, setQrCache] = useState<Record<string, string>>({})

  // Pagination / search
  const [searchQuery, setSearchQuery] = useState("")
  const [pageSize, setPageSize] = useState<number>(9)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // carregar pontos do backend no mount (fallback para localStorage)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const raw = await pontoService.getPontos()
        if (!mounted) return
        // mapear RawPonto -> PontoVenda
        const mapped = raw.map((r) => ({
          id: r._id,
          nome: r.descricao,
          endereco: undefined,
          telefone: undefined,
          lat: r.coordinates?.coordinates?.[0],
          lng: r.coordinates?.coordinates?.[1],
          qrCodeLink: r.qrCodeLink,
          // manter raw se precisar
        }))
        setPontos(mapped)
      } catch (err) {
        // fallback: tentar carregar do cache local
        try {
          const local = localStorage.getItem("pontos_venda")
          if (local && mounted) setPontos(JSON.parse(local))
        } catch (e) {
          // ignore
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("pontos_venda", JSON.stringify(pontos))
  }, [pontos])

  const gerarId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`

  // Initialize Leaflet map when modal opens
  useEffect(() => {
    if (!isAddOpen) return
    let mounted = true
    ;(async () => {
      try {
        const L = await import("leaflet")
        if (!mounted || !mapRef.current) return

        // create map if not exists
        if (!leafletMapRef.current) {
          const map = L.map(mapRef.current).setView([-8.8383, 13.2344], 12)
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map)
          // cria o ícone custom e guarda no ref
          markerIconRef.current = L.icon({
            iconUrl: "/simbolo.png",
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
            className: "talagas-marker",
          })
          leafletMapRef.current = map

          map.on("click", (e: any) => {
            const { lat: clickedLat, lng: clickedLng } = e.latlng
            setLat(Number(clickedLat.toFixed(6)))
            setLng(Number(clickedLng.toFixed(6)))

            if (markerRef.current) {
              markerRef.current.setLatLng(e.latlng)
            } else {
              // usar ícone custom se disponível
              const opts = markerIconRef.current ? { icon: markerIconRef.current } : undefined
              markerRef.current = L.marker(e.latlng, opts).addTo(map)
            }
          })
        } else {
          // se mapa já existe, invalidar tamanho para renderizar corretamente
          try { leafletMapRef.current.invalidateSize() } catch (e) {}
        }
      } catch (err) {
        console.error("Erro ao carregar leaflet:", err)
      }
    })()

    return () => {
      mounted = false
      // do not destroy map to preserve state between openings
    }
  }, [isAddOpen])

  // helper: adiciona/atualiza markers no mapa principal
  const addMarkers = () => {
    const map = leafletMainRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    // limpar markers antigos
    layer.clearLayers()

    // criar markers novos
    const L = (window as any).L
    for (const p of pontos) {
      if (p.lat == null || p.lng == null) continue
      const marker = L.marker([p.lat, p.lng], markerIconRef.current ? { icon: markerIconRef.current } : undefined)
      marker.addTo(layer)
      // ao clicar, abrir painel lateral com os detalhes
      marker.on("click", () => {
        setSelectedPoint(p)
        setSideOpen(true)
        try {
          map.setView([p.lat!, p.lng!], 15, { animate: true })
        } catch (e) {}
      })
    }
  }

  // --- Inicializar mapa principal quando a modal for aberta ---
  useEffect(() => {
    if (!isMapOpen) return
    let mounted = true
    ;(async () => {
      try {
        const L = await import("leaflet")
        if (!mounted || !mapMainRef.current) return

        if (!leafletMainRef.current) {
          const map = L.map(mapMainRef.current, { preferCanvas: true }).setView([-8.8383, 13.2344], 12)
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map)

          // criar icon custom para usar nos markers principais (e reutilizar)
          markerIconRef.current = L.icon({
            iconUrl: "/simbolo.png",
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
            className: "talagas-marker",
          })

          // layerGroup para controle dos markers
          markersLayerRef.current = L.layerGroup().addTo(map)
          leafletMainRef.current = map
        } else {
          // se o mapa já existia (caso preserve entre aberturas), invalidateSize para render correto
          try { leafletMainRef.current.invalidateSize() } catch (e) {}
        }

        // garantir markers atuais após inicializar o mapa
        addMarkers()
      } catch (err) {
        console.error("Erro ao inicializar mapa principal:", err)
      }
    })()
    return () => {
      mounted = false
    }
  }, [isMapOpen])

  // atualizar markers sempre que pontos mudam OU quando modal abre (para garantir render)
  useEffect(() => {
    addMarkers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontos, isMapOpen])

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocalização não suportada" })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(Number(latitude.toFixed(6)))
        setLng(Number(longitude.toFixed(6)))
        const map = leafletMapRef.current
        if (map) {
          map.setView([latitude, longitude], 15)
          // usamos o ícone guardado, se existir, para o marker
          const L = (window as any).L
          const opts = markerIconRef.current ? { icon: markerIconRef.current } : undefined
          if (L) {
            if (markerRef.current) markerRef.current.setLatLng([latitude, longitude])
            else markerRef.current = L.marker([latitude, longitude], opts).addTo(map)
          }
        }
      },
      (err) => {
        toast({ title: "Erro ao obter localização" })
        console.error(err)
      },
    )
  }

  const resetForm = () => {
    setNome("")
    setEndereco("")
    setTelefone("")
    setLat(undefined)
    setLng(undefined)
    if (markerRef.current && leafletMapRef.current) {
      leafletMapRef.current.removeLayer(markerRef.current)
      markerRef.current = null
    }
  }

  const handleAddSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" })
      return
    }
    if (lat == null || lng == null) {
      toast({ title: "Selecione a localização no mapa", variant: "destructive" })
      return
    }
    try {
      const payload = { descricao: nome.trim(), coordinates: [lat, lng] as [number, number] }
      const created = await pontoService.createPonto(payload)
      const novo: PontoVenda = {
        id: created._id,
        nome: created.descricao,
        endereco: undefined,
        telefone: undefined,
        lat: created.coordinates?.coordinates?.[0],
        lng: created.coordinates?.coordinates?.[1],
        qrCodeLink: created.qrCodeLink,
      }
      setPontos((prev) => [novo, ...prev])
      resetForm()
      setIsAddOpen(false)
      toast({ title: "Ponto criado no servidor" })
    } catch (err: any) {
      console.error(err)
      toast({ title: "Erro ao criar ponto", description: err?.message ?? String(err), variant: "destructive" })
    }
  }

  // salvar edição do ponto (no painel lateral) -> PUT /empresas/pontos/:id
  const handleSaveSideEdit = async () => {
    if (!selectedPoint) return
    try {
      const payload: any = { descricao: sideForm.descricao }
      if (sideForm.lat != null && sideForm.lng != null) payload.coordinates = [sideForm.lat, sideForm.lng]
      const updated = await pontoService.updatePonto(selectedPoint.id, payload)
      // atualizar lista localmente
      setPontos((prev) =>
        prev.map((p) =>
          p.id === selectedPoint.id
            ? { ...p, nome: updated.descricao, lat: updated.coordinates?.coordinates?.[0], lng: updated.coordinates?.coordinates?.[1], qrCodeLink: updated.qrCodeLink }
            : p,
        ),
      )
      // atualizar seleção e sair do modo edição
      setSelectedPoint((s) => (s ? { ...s, nome: updated.descricao, lat: updated.coordinates?.coordinates?.[0], lng: updated.coordinates?.coordinates?.[1], qrCodeLink: updated.qrCodeLink } : s))
      setEditingSide(false)
      toast({ title: "Ponto atualizado" })
    } catch (err: any) {
      console.error(err)
      toast({ title: "Erro ao atualizar ponto", description: err?.message ?? String(err), variant: "destructive" })
    }
  }

  // Remove ponto (otimista) -> chama DELETE no backend
  const removePonto = async (id: string) => {
    const prev = pontos
    // otimista: remover do estado e do cache de QR
    setPontos((cur) => cur.filter((p) => p.id !== id))
    setQrCache((c) => {
      const copy = { ...c }
      delete copy[id]
      return copy
    })
    try {
      await pontoService.deletePonto(id)
      // persist cache/estado no localStorage
      try {
        localStorage.setItem("pontos_venda", JSON.stringify(pontos.filter((p) => p.id !== id)))
      } catch (e) {
        // ignore
      }
      toast({ title: "Ponto removido", description: "O ponto foi removido com sucesso." })
    } catch (err: any) {
      // rollback em caso de erro
      setPontos(prev)
      toast({
        title: "Erro ao remover ponto",
        description: err?.message ?? "Não foi possível remover o ponto no servidor.",
        variant: "destructive",
      })
      console.error("Erro ao remover ponto:", err)
    }
  }

  // QR helpers: priorizar qrCodeLink proveniente do backend, fallback para esquema interno
  const payloadFor = (p: PontoVenda) => {
    if (!p) return ""
    if (p.qrCodeLink) return p.qrCodeLink
  }

  const dataURLToBlob = (dataurl: string) => {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  const downloadAllAsZip = async () => {
    if (pontos.length === 0) {
      toast({ title: "Nenhum ponto cadastrado", variant: "destructive" })
      return
    }

    const zip = new JSZip()

    for (const p of pontos) {
      try {
        const dataUrl = await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
        const blob = dataURLToBlob(dataUrl)
        zip.file(`qr-${p.id}.png`, blob)
      } catch (err) {
        console.error("Erro gerando QR localmente:", err)
      }
    }

    try {
      const content = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(content)
      const a = document.createElement("a")
      a.href = url
      a.download = `qrcodes-pontos-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: "ZIP gerado", description: "Download iniciado" })
    } catch (err) {
      console.error("Erro ao gerar ZIP:", err)
      toast({ title: "Erro ao gerar ZIP", variant: "destructive" })
    }
  }

  // --- Novo: atualizar markers quando pontos mudam ---
  useEffect(() => {
    const map = leafletMainRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    // limpar markers antigos
    layer.clearLayers()

    // criar markers novos
    const L = (window as any).L
    for (const p of pontos) {
      if (p.lat == null || p.lng == null) continue
      const marker = L.marker([p.lat, p.lng], markerIconRef.current ? { icon: markerIconRef.current } : undefined)
      marker.addTo(layer)
      // ao clicar, abrir painel lateral com os detalhes
      marker.on("click", () => {
        setSelectedPoint(p)
        setSideOpen(true)
        try {
          map.setView([p.lat!, p.lng!], 15, { animate: true })
        } catch (e) {}
      })
    }
  }, [pontos])

  // --- Search / Filter / Pagination ---
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return pontos
    return pontos.filter((p) => (p.nome + " " + (p.endereco || "") + " " + (p.telefone || "")).toLowerCase().includes(q))
  }, [pontos, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // cache QR for items on current page (moved *after* paginated declaration to avoid reference error)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      for (const p of paginated) {
        if (!qrCache[p.id]) {
          try {
            const dataUrl = await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
            if (!mounted) return
            setQrCache((c) => ({ ...c, [p.id]: dataUrl }))
          } catch (err) {
            console.error("Erro gerando QR:", err)
          }
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [paginated, qrCache])

  // quando abrir a modal de lista, garantir que todos QRs dos pontos estão em cache
  useEffect(() => {
    if (!isListOpen) return
    let mounted = true
    ;(async () => {
      for (const p of pontos) {
        if (!qrCache[p.id]) {
          try {
            const dataUrl = await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
            if (!mounted) return
            setQrCache((c) => ({ ...c, [p.id]: dataUrl }))
          } catch (err) {
            console.error("Erro gerando QR na modal:", err)
          }
        }
      }
    })()
    return () => { mounted = false }
  }, [isListOpen, pontos, qrCache])

  // local changes in modal side panel: quando selectedPoint definido, preencher sideForm e permitir editar
  useEffect(() => {
    if (selectedPoint) {
      setSideForm({ descricao: selectedPoint.nome, lat: selectedPoint.lat, lng: selectedPoint.lng })
    } else {
      setSideForm({ descricao: "", lat: undefined, lng: undefined })
    }
  }, [selectedPoint])

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Distribuição — Pontos de Venda</h1>
          <p className="text-sm text-muted-foreground">Cadastre pontos de venda e gere códigos QR para cada um.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* botão para abrir modal gigante do mapa */}
          <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir Mapa (Modal)</Button>
            </DialogTrigger>

            <DialogPortal>
              {/* Overlay (escurece o fundo) */}
              <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

              {/* Content centralizado corretamente */}
              <DialogContent className="max-w-[95vw] h-[95vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Mapa de Pontos de Venda</DialogTitle>
                  <DialogDescription>
                    Mapa gigante com todos os pontos cadastrados
                  </DialogDescription>
                </DialogHeader>

                {/* layout: map (esquerda) + painel lateral (direita) dentro da modal */}
                <div className="h-[calc(95vh-180px)] w-full rounded-md border overflow-hidden flex gap-4">
                  <div className="flex-1">
                    <div ref={mapMainRef} className="h-full w-full" />
                  </div>

                  <div className="w-80 border-l bg-white p-4 overflow-auto">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedPoint?.nome ?? "Detalhes"}</h3>
                        <div className="text-sm text-muted-foreground">{selectedPoint?.endereco ?? "-"}</div>
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // fechar painel / limpar seleção
                            setIsMapOpen(false);
                          }}
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>

                    {selectedPoint ? (
                      <div className="space-y-3">
                        {/* vista + edição */}
                        <div className="flex items-center gap-3">
                          <img src="/simbolo.png" alt="Talagas" className="h-12 w-12 rounded" />
                          <div>
                            <div className="font-medium">{selectedPoint?.nome}</div>
                            <div className="text-sm text-muted-foreground">{selectedPoint?.telefone ?? "-"}</div>
                          </div>
                        </div>

                        {!editingSide ? (
                          <div className="text-sm">
                            <div><strong>Endereço:</strong> {selectedPoint?.endereco ?? "-"}</div>
                            <div><strong>Lat / Lng:</strong> {selectedPoint?.lat ?? "-"} • {selectedPoint?.lng ?? "-"}</div>
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" onClick={() => setEditingSide(true)}>Editar</Button>
                              <Button size="sm" onClick={async () => {
                                try {
                                  const dataUrl = qrCache[selectedPoint.id] ?? await QRCode.toDataURL(payloadFor(selectedPoint), { width: QR_SIZE })
                                  const a = document.createElement("a")
                                  a.href = dataUrl
                                  a.download = `qr-${selectedPoint.id}.png`
                                  document.body.appendChild(a)
                                  a.click()
                                  a.remove()
                                } catch (err) {
                                  console.error(err)
                                }
                              }}>Baixar PNG</Button>
                              <Button size="sm" variant="destructive" onClick={() => { removePonto(selectedPoint.id); setSelectedPoint(null) }}>Remover</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <Label>Descrição</Label>
                              <Input value={sideForm.descricao} onChange={(e) => setSideForm((s) => ({ ...s, descricao: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Lat</Label>
                              <Input type="number" value={sideForm.lat ?? ""} onChange={(e) => setSideForm((s) => ({ ...s, lat: Number(e.target.value) }))} />
                            </div>
                            <div>
                              <Label>Lng</Label>
                              <Input type="number" value={sideForm.lng ?? ""} onChange={(e) => setSideForm((s) => ({ ...s, lng: Number(e.target.value) }))} />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveSideEdit}>Salvar</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingSide(false)}>Cancelar</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Clique em um marker para ver detalhes</div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t">
                  <DialogFooter className="p-0">
                    <div className="flex justify-end">
                      <Button variant="ghost" onClick={() => setIsMapOpen(false)}>Fechar</Button>
                    </div>
                  </DialogFooter>
                </div>
              </DialogContent>
            </DialogPortal>
          </Dialog>


          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>Adicionar Ponto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Adicionar Ponto de Venda</DialogTitle>
                <DialogDescription>Preencha os dados e selecione a localização no mapa (clique no mapa).</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddSubmit} className="space-y-4 flex-1 overflow-auto p-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Loja Exemplo" />
                </div>
                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, nº, bairro" />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(xx) 9xxxx-xxxx" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Button type="button" variant="outline" onClick={handleUseMyLocation}>Usar minha localização</Button>
                    <div className="text-sm text-muted-foreground">ou clique no mapa para selecionar</div>
                  </div>
                  <div className="h-64 w-full rounded-md border" ref={mapRef} />
                  <div className="mt-2 text-sm text-muted-foreground">Latitude: {lat ?? '-'} • Longitude: {lng ?? '-'}</div>
                </div>

                <DialogFooter>
                  <div className="flex items-center gap-2">
                    <Button type="submit">Salvar</Button>
                    <DialogClose asChild>
                      <Button variant="ghost" onClick={() => { resetForm(); setIsAddOpen(false) }}>Cancelar</Button>
                    </DialogClose>
                  </div>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {/* botão para abrir modal com todos os pontos em cards */}
          <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Mostrar todos</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Todos os Pontos de Venda</DialogTitle>
                <DialogDescription>Visualize todos os pontos cadastrados com logo e QR code.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-2">
                {pontos.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum ponto cadastrado</div>}
                {pontos.map((p) => (
                  <div key={p.id} className="rounded-lg border p-4 bg-card">
                    <div className="flex items-center gap-3">
                      <img src="/simbolo.png" alt="Talagas" className="h-12 w-12 rounded" />
                      <div>
                        <div className="font-semibold">{p.nome}</div>
                        <div className="text-sm text-muted-foreground">{p.endereco ?? "-"}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <div>Telefone: {p.telefone ?? "-"}</div>
                      <div>Lat: {p.lat ?? "-"} • Lng: {p.lng ?? "-"}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <a className={`text-sm underline ${!qrCache[p.id] ? "opacity-50 pointer-events-none" : ""}`} href={qrCache[p.id] ?? "#"} target="_blank" rel="noreferrer">Abrir QR</a>
                      <button
                        className="text-sm underline"
                        onClick={async () => {
                          try {
                            const dataUrl = qrCache[p.id] ?? await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
                            const a = document.createElement("a")
                            a.href = dataUrl
                            a.download = `qr-${p.id}.png`
                            document.body.appendChild(a)
                            a.click()
                            a.remove()
                          } catch (err) {
                            console.error(err)
                          }
                        }}
                      >
                        Baixar PNG
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsListOpen(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* mapa agora aberto via modal gigante (botão acima) */}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Controles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Input placeholder="Pesquisar por nome, endereço, telefone" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
                <div className="flex items-center gap-2">
                  <Label htmlFor="pageSize">Por página</Label>
                  <select id="pageSize" value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }} className="rounded-md border px-2 py-1">
                    <option value="6">6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={downloadAllAsZip} disabled={pontos.length === 0}>
                  Baixar todos os códigos QR (ZIP)
                </Button>
                <Button variant="outline" onClick={() => { setPontos([]); localStorage.removeItem("pontos_venda"); toast({ title: "Lista limpa" }) }}>
                  Limpar todos
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">Os QR codes são gerados localmente; o ZIP é gerado no navegador.</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards view */}
      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {paginated.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum ponto para exibir</div>}
        {paginated.map((p) => (
          <div key={p.id} className="rounded-lg border p-4 bg-card">
            <div className="flex items-center gap-3">
              <img src="/simbolo.png" alt="Talagas" className="h-12 w-12 rounded" />
              <div className="flex-1">
                <div className="font-semibold">{p.nome}</div>
                <div className="text-sm text-muted-foreground">{p.endereco ?? "-"}</div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <div>Telefone: {p.telefone ?? "-"}</div>
              <div>Lat: {p.lat ?? "-"} • Lng: {p.lng ?? "-"}</div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <a className={`text-sm underline ${!qrCache[p.id] ? "opacity-50 pointer-events-none" : ""}`} href={qrCache[p.id] ?? "#"} target="_blank" rel="noreferrer">Abrir QR</a>
                <button
                  className="text-sm underline"
                  onClick={async () => {
                    try {
                      const dataUrl = qrCache[p.id] ?? await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
                      const a = document.createElement("a")
                      a.href = dataUrl
                      a.download = `qr-${p.id}.png`
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                    } catch (err) {
                      console.error(err)
                    }
                  }}
                >
                  Baixar PNG
                </button>
              </div>
              <Button size="sm" variant="link" onClick={() => { removePonto(p.id); toast({ title: "Ponto removido" }) }}>Remover</Button>
            </div>
          </div>
        ))}
      </div>

      {/* enquanto modal do mapa estiver aberta, escondemos o aside fixo para evitar duplicar o painel */}
      {!isMapOpen && (
        <aside
          aria-hidden={!sideOpen}
          className={`fixed right-0 top-0 h-full w-80 bg-white border-l z-50 transform transition-transform ${sideOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="p-4 flex items-start justify-between border-b">
            <div>
              <h3 className="text-lg font-semibold">{selectedPoint?.nome ?? "Detalhes"}</h3>
              <div className="text-sm text-muted-foreground">{selectedPoint?.endereco ?? "-"}</div>
            </div>
            <div>
              <Button variant="ghost" onClick={() => { setSideOpen(false); setSelectedPoint(null) }}>Fechar</Button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <img src="/simbolo.png" alt="Talagas" className="h-12 w-12 rounded" />
              <div>
                <div className="font-medium">{selectedPoint?.nome}</div>
                <div className="text-sm text-muted-foreground">{selectedPoint?.telefone ?? "-"}</div>
              </div>
            </div>

            <div className="text-sm">
              <div><strong>Endereço:</strong> {selectedPoint?.endereco ?? "-"}</div>
              <div><strong>Lat / Lng:</strong> {selectedPoint?.lat ?? "-"} • {selectedPoint?.lng ?? "-"}</div>
            </div>

            <div>
              <div className="font-medium mb-2">QR Code</div>
              {selectedPoint ? (
                <>
                  {qrCache[selectedPoint.id] ? (
                    <img src={qrCache[selectedPoint.id]} alt="QR" className="w-full h-auto border" />
                  ) : (
                    <div className="text-sm text-muted-foreground">Gerando QR...</div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={async () => {
                      try {
                        const dataUrl = qrCache[selectedPoint.id] ?? await QRCode.toDataURL(payloadFor(selectedPoint), { width: QR_SIZE })
                        const a = document.createElement("a")
                        a.href = dataUrl
                        a.download = `qr-${selectedPoint.id}.png`
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                      } catch (err) {
                        console.error(err)
                      }
                    }}>Baixar PNG</Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      if (!selectedPoint) return
                      removePonto(selectedPoint.id)
                      setSideOpen(false)
                      setSelectedPoint(null)
                    }}>Remover</Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </aside>
      )}

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
        <div>
          Página {currentPage} / {totalPages}
        </div>
        <Button size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima</Button>
      </div>
    </div>
  )
}
