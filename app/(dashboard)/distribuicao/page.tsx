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
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
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
  const [mapSearch, setMapSearch] = useState("")
  const [mapSearchLoading, setMapSearchLoading] = useState(false)
  const [mapSearchError, setMapSearchError] = useState<string | null>(null)
  const [mapSearchResults, setMapSearchResults] = useState<PontoVenda[] | null>(null)

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
          endereco: r.endereco,
          telefone: r.telefone,
          lat: r.coordinates?.coordinates?.[0],
          lng: r.coordinates?.coordinates?.[1],
          qrCodeLink: r.qrCodeLink,
          isActive: r.isActive,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
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

  // Baixar todos os QRs: nome do arquivo = nome do ponto (slug) + id
  const slugify = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()

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
        // Nome do arquivo: nome-do-ponto_id.png
        const nomeArquivo = `${slugify(p.nome)}_${p.id}.png`
        zip.file(nomeArquivo, blob)
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

  // Pesquisa por descrição/nome do ponto cadastrado (não usa Nominatim, só filtra pontos)
  const handleMapSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = mapSearch.trim().toLowerCase()
    if (!q) {
      setMapSearchResults(null)
      setMapSearchError(null)
      return
    }
    const results = pontos.filter(
      (p) =>
        (p.nome?.toLowerCase().includes(q)) ||
        (p.endereco?.toLowerCase().includes(q)) ||
        (p.telefone?.toLowerCase().includes(q))
    )
    setMapSearchResults(results)
    setMapSearchError(results.length === 0 ? "Nenhum ponto encontrado para sua busca." : null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Distribuição — Pontos de Venda</h1>
          <p className="text-base text-muted-foreground mt-1">
            Cadastre pontos de venda, visualize no mapa e gere códigos QR personalizados para cada local.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>Adicionar Ponto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl w-full">
              <DialogHeader>
                <DialogTitle>Adicionar Ponto de Venda</DialogTitle>
                <DialogDescription>
                  Preencha os dados e selecione a localização no mapa (clique no mapa).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4" autoComplete="off">
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
                  <Label>Pesquisar ponto cadastrado</Label>
                  <div className="flex gap-2">
                    <Input
                      value={mapSearch}
                      onChange={e => setMapSearch(e.target.value)}
                      placeholder="Digite nome, endereço ou telefone..."
                      autoComplete="off"
                    />
                    <Button type="button" onClick={handleMapSearch} disabled={!mapSearch.trim()}>
                      Buscar
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => { setMapSearch(""); setMapSearchResults(null); setMapSearchError(null); }}>
                      Limpar
                    </Button>
                  </div>
                  {mapSearchError && <div className="text-xs text-destructive mt-1">{mapSearchError}</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    Ex: "Ponto de Venda", "Talatona", "923456789"
                  </div>
                  {mapSearchResults && mapSearchResults.length > 0 && (
                    <div className="mt-2 border rounded bg-muted/50 p-2 max-h-40 overflow-auto">
                      <div className="text-xs mb-1 text-muted-foreground">Resultados:</div>
                      {mapSearchResults.map((p) => (
                        <div
                          key={p.id}
                          className="cursor-pointer hover:bg-primary/10 rounded px-2 py-1 flex flex-col"
                          onClick={() => {
                            setNome(p.nome)
                            setEndereco(p.endereco ?? "")
                            setTelefone(p.telefone ?? "")
                            setLat(p.lat)
                            setLng(p.lng)
                            setMapSearch(p.nome)
                            setMapSearchResults(null)
                            setMapSearchError(null)
                            // Centraliza no mapa de cadastro se aberto
                            if (leafletMapRef.current && p.lat && p.lng) {
                              leafletMapRef.current.setView([p.lat, p.lng], 16)
                              const L = (window as any).L
                              const opts = markerIconRef.current ? { icon: markerIconRef.current } : undefined
                              if (markerRef.current) markerRef.current.setLatLng([p.lat, p.lng])
                              else markerRef.current = L.marker([p.lat, p.lng], opts).addTo(leafletMapRef.current)
                            }
                          }}
                        >
                          <span className="font-medium">{p.nome}</span>
                          <span className="text-xs text-muted-foreground">{p.endereco ?? "-"}</span>
                          <span className="text-xs text-muted-foreground">{p.telefone ?? "-"}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
          <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir Mapa</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] h-[90vh] overflow-hidden p-0">
              <DialogHeader>
                <DialogTitle>Mapa de Pontos de Venda</DialogTitle>
                <DialogDescription>
                  Visualize todos os pontos cadastrados no mapa interativo.
                </DialogDescription>
              </DialogHeader>
              <div className="h-[70vh] w-full rounded-md border overflow-hidden flex gap-4 bg-white">
                <div className="flex-1">
                  <div ref={mapMainRef} className="h-full w-full" />
                </div>
                <div className="w-96 border-l bg-white p-4 overflow-auto">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedPoint?.nome ?? "Detalhes"}</h3>
                      <div className="text-sm text-muted-foreground">{selectedPoint?.endereco ?? "-"}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSideOpen(false); setSelectedPoint(null) }}>Fechar</Button>
                  </div>
                  {selectedPoint ? (
                    <div className="space-y-3">
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
                        <div><strong>Status:</strong> {selectedPoint?.isActive ? "Ativo" : "Inativo"}</div>
                        <div><strong>Criado em:</strong> {selectedPoint?.createdAt ? new Date(selectedPoint.createdAt).toLocaleString("pt-AO") : "-"}</div>
                        <div><strong>Atualizado em:</strong> {selectedPoint?.updatedAt ? new Date(selectedPoint.updatedAt).toLocaleString("pt-AO") : "-"}</div>
                      </div>
                      <div>
                        <div className="font-medium mb-2">QR Code</div>
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
                              a.download = `${slugify(selectedPoint.nome)}_${selectedPoint.id}.png`
                              document.body.appendChild(a)
                              a.click()
                              a.remove()
                            } catch (err) { console.error(err) }
                          }}>Baixar PNG</Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            removePonto(selectedPoint.id)
                            setSelectedPoint(null)
                          }}>Remover</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Clique em um marker para ver detalhes</div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsMapOpen(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Mostrar todos</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl w-full">
              <DialogHeader>
                <DialogTitle>Todos os Pontos de Venda</DialogTitle>
                <DialogDescription>Visualize todos os pontos cadastrados com logo e QR code.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-2">
                {pontos.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum ponto cadastrado</div>}
                {pontos.map((p) => (
                  <div key={p.id} className="rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <img src="/simbolo.png" alt="Talagas" className="h-12 w-12 rounded" />
                      <div>
                        <div className="font-semibold text-lg">{p.nome}</div>
                        <div className="text-sm text-muted-foreground">{p.endereco ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">{p.telefone ?? "-"}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>Lat: {p.lat ?? "-"} • Lng: {p.lng ?? "-"}</div>
                      <div>Status: {p.isActive ? "Ativo" : "Inativo"}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a className={`text-sm underline ${!qrCache[p.id] ? "opacity-50 pointer-events-none" : ""}`} href={qrCache[p.id] ?? "#"} target="_blank" rel="noreferrer">Abrir QR</a>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const dataUrl = qrCache[p.id] ?? await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
                            const a = document.createElement("a")
                            a.href = dataUrl
                            a.download = `${slugify(p.nome)}_${p.id}.png`
                            document.body.appendChild(a)
                            a.click()
                            a.remove()
                          } catch (err) {
                            console.error(err)
                          }
                        }}
                      >
                        Baixar PNG
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsListOpen(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={downloadAllAsZip} disabled={pontos.length === 0}>
            Baixar todos os códigos QR (ZIP)
          </Button>
        </div>
      </div>

      {/* Cards view */}
      <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {paginated.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum ponto para exibir</div>}
        {paginated.map((p) => (
          <div key={p.id} className="rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img src="/simbolo.png" alt="Talagas" className="h-12 w-12 rounded" />
              <div className="flex-1">
                <div className="font-semibold text-lg">{p.nome}</div>
                <div className="text-sm text-muted-foreground">{p.endereco ?? "-"}</div>
                <div className="text-xs text-muted-foreground">{p.telefone ?? "-"}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <div>Lat: {p.lat ?? "-"} • Lng: {p.lng ?? "-"}</div>
              <div>Status: {p.isActive ? "Ativo" : "Inativo"}</div>
            </div>
            <div className="flex flex-col gap-2">
              <a className={`text-sm underline ${!qrCache[p.id] ? "opacity-50 pointer-events-none" : ""}`} href={qrCache[p.id] ?? "#"} target="_blank" rel="noreferrer">Abrir QR</a>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const dataUrl = qrCache[p.id] ?? await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
                    const a = document.createElement("a")
                    a.href = dataUrl
                    a.download = `${slugify(p.nome)}_${p.id}.png`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                  } catch (err) {
                    console.error(err)
                  }
                }}
              >
                Baixar PNG
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { removePonto(p.id); toast({ title: "Ponto removido" }) }}>Remover</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <Button size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
        <div>
          Página {currentPage} / {totalPages}
        </div>
        <Button size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima</Button>
      </div>
    </div>
  )
}
