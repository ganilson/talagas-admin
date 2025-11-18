"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { MaterialIcon } from "@/components/material-icon"
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
  DialogClose,
} from "@/components/ui/dialog"
import "leaflet/dist/leaflet.css"
import * as pontoService from "@/services/pontoService"

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
  const mapAddRef = useRef<HTMLDivElement | null>(null)
  const leafletAddRef = useRef<any>(null)
  const markerAddRef = useRef<any>(null)
  const mapMainRef = useRef<HTMLDivElement | null>(null)
  const leafletMainRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const [selectedPoint, setSelectedPoint] = useState<PontoVenda | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [nome, setNome] = useState("")
  const [endereco, setEndereco] = useState("")
  const [telefone, setTelefone] = useState("")
  const [lat, setLat] = useState<number | undefined>(undefined)
  const [lng, setLng] = useState<number | undefined>(undefined)
  const [qrCache, setQrCache] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [pageSize, setPageSize] = useState<number>(12)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [locationSearch, setLocationSearch] = useState("")
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [areaSearch, setAreaSearch] = useState("")
  const [areaLoading, setAreaLoading] = useState(false)
  const [areaSuggestions, setAreaSuggestions] = useState<any[]>([])
  const [areaError, setAreaError] = useState<string | null>(null)

  // Carregar pontos do backend
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const raw = await pontoService.getPontos()
        if (!mounted) return
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
        }))
        setPontos(mapped)
      } catch (err) {
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

  // Persistir pontos
  useEffect(() => {
    localStorage.setItem("pontos_venda", JSON.stringify(pontos))
  }, [pontos])

  // Pesquisar áreas (bairros, regiões)
  const handleAreaSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!areaSearch.trim()) {
      setAreaSuggestions([])
      setAreaError(null)
      return
    }

    setAreaLoading(true)
    setAreaError(null)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(areaSearch + ", Luanda, Angola")}&countrycodes=ao&limit=15`,
        { headers: { "Accept-Language": "pt" } }
      )
      const results = await response.json()

      if (results.length === 0) {
        setAreaError("Nenhuma área encontrada. Tente com outro nome.")
        setAreaSuggestions([])
      } else {
        setAreaSuggestions(results)
      }
    } catch (err) {
      setAreaError("Erro ao pesquisar áreas")
      console.error(err)
    } finally {
      setAreaLoading(false)
    }
  }

  // Selecionar área
  const selectArea = (area: any) => {
    const areaLat = parseFloat(area.lat)
    const areaLng = parseFloat(area.lon)

    // Extrair nome melhor (primeiro componente antes da vírgula)
    const areaName = area.display_name.split(",")[0]
    
    setNome(areaName)
    setEndereco(area.display_name)
    setLat(Number(areaLat.toFixed(6)))
    setLng(Number(areaLng.toFixed(6)))
    setAreaSuggestions([])
    setAreaSearch("")

    // Atualizar mapa automaticamente
    if (leafletAddRef.current) {
      leafletAddRef.current.setView([areaLat, areaLng], 15)
      const L = (window as any).L
      const opts = markerIconRef.current ? { icon: markerIconRef.current } : undefined
      if (markerAddRef.current) {
        markerAddRef.current.setLatLng([areaLat, areaLng])
      } else {
        markerAddRef.current = L.marker([areaLat, areaLng], opts).addTo(leafletAddRef.current)
      }
    }

    toast({ title: "Área selecionada", description: `${areaName} - ${areaLat.toFixed(4)}, ${areaLng.toFixed(4)}` })
  }

  // Pesquisar endereço usando Nominatim (OpenStreetMap)
  const handleLocationSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!locationSearch.trim()) {
      setLocationSuggestions([])
      setLocationError(null)
      return
    }

    setLocationLoading(true)
    setLocationError(null)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&countrycodes=ao&limit=10`,
        { headers: { "Accept-Language": "pt" } }
      )
      const results = await response.json()

      if (results.length === 0) {
        setLocationError("Nenhuma localização encontrada. Tente com outro nome.")
        setLocationSuggestions([])
      } else {
        setLocationSuggestions(results)
      }
    } catch (err) {
      setLocationError("Erro ao pesquisar localização")
      console.error(err)
    } finally {
      setLocationLoading(false)
    }
  }

  // Selecionar sugestão e atualizar mapa
  const selectLocation = (location: any) => {
    const locLat = parseFloat(location.lat)
    const locLng = parseFloat(location.lon)

    setNome(location.display_name.split(",")[0])
    setEndereco(location.display_name)
    setLat(Number(locLat.toFixed(6)))
    setLng(Number(locLng.toFixed(6)))
    setLocationSuggestions([])
    setLocationSearch("")

    // Atualizar mapa se aberto
    if (leafletAddRef.current) {
      leafletAddRef.current.setView([locLat, locLng], 16)
      const L = (window as any).L
      const opts = markerIconRef.current ? { icon: markerIconRef.current } : undefined
      if (markerAddRef.current) {
        markerAddRef.current.setLatLng([locLat, locLng])
      } else {
        markerAddRef.current = L.marker([locLat, locLng], opts).addTo(leafletAddRef.current)
      }
    }
  }

  // Inicializar mapa de cadastro
  useEffect(() => {
    if (!isAddOpen) return
    let mounted = true
    ;(async () => {
      try {
        const L = await import("leaflet")
        if (!mounted || !mapAddRef.current) return

        if (!leafletAddRef.current) {
          const map = L.map(mapAddRef.current).setView([-8.8383, 13.2344], 12)
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          }).addTo(map)

          markerIconRef.current = L.icon({
            iconUrl: "/simbolo.png",
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
            className: "talagas-marker",
          })

          leafletAddRef.current = map

          map.on("click", (e: any) => {
            const { lat: clickedLat, lng: clickedLng } = e.latlng
            setLat(Number(clickedLat.toFixed(6)))
            setLng(Number(clickedLng.toFixed(6)))

            if (markerAddRef.current) {
              markerAddRef.current.setLatLng(e.latlng)
            } else {
              const opts = markerIconRef.current ? { icon: markerIconRef.current } : undefined
              markerAddRef.current = L.marker(e.latlng, opts).addTo(map)
            }
          })
        } else {
          setTimeout(() => {
            try {
              leafletAddRef.current.invalidateSize()
            } catch (e) {}
          }, 100)
        }
      } catch (err) {
        console.error("Erro ao carregar leaflet:", err)
      }
    })()

    return () => {
      mounted = false
    }
  }, [isAddOpen])

  // Inicializar mapa principal (com correção para renderizar corretamente)
  useEffect(() => {
    if (!isMapOpen || !mapMainRef.current) return

    let mounted = true
    const initMapTimeout = setTimeout(async () => {
      try {
        const L = await import("leaflet")
        if (!mounted || !mapMainRef.current) return

        // Remover instância anterior se existir
        if (leafletMainRef.current) {
          try {
            leafletMainRef.current.remove()
          } catch (e) {}
          leafletMainRef.current = null
          markersLayerRef.current = null
        }

        // Criar novo mapa
        const map = L.map(mapMainRef.current, { preferCanvas: true }).setView([-8.8383, 13.2344], 12)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        markerIconRef.current = L.icon({
          iconUrl: "/simbolo.png",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
          className: "talagas-marker",
        })

        markersLayerRef.current = L.layerGroup().addTo(map)
        leafletMainRef.current = map

        addMarkersToMap()

        // Redimensionar mapa após renderização
        setTimeout(() => {
          if (map && mounted) {
            try {
              map.invalidateSize()
            } catch (e) {}
          }
        }, 300)
      } catch (err) {
        console.error("Erro ao inicializar mapa principal:", err)
      }
    }, 100)

    return () => {
      mounted = false
      clearTimeout(initMapTimeout)
    }
  }, [isMapOpen])

  // Adicionar markers ao mapa principal
  const addMarkersToMap = () => {
    const map = leafletMainRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    try {
      layer.clearLayers()

      const L = (window as any).L
      for (const p of pontos) {
        if (p.lat == null || p.lng == null) continue
        const marker = L.marker([p.lat, p.lng], markerIconRef.current ? { icon: markerIconRef.current } : undefined)
        marker.addTo(layer)
        marker.on("click", () => {
          setSelectedPoint(p)
          try {
            map.setView([p.lat!, p.lng!], 15, { animate: true })
          } catch (e) {}
        })
      }
    } catch (err) {
      console.error("Erro ao adicionar markers:", err)
    }
  }

  useEffect(() => {
    if (isMapOpen && leafletMainRef.current) {
      addMarkersToMap()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontos])

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
        const map = leafletAddRef.current
        if (map) {
          map.setView([latitude, longitude], 15)
          const L = (window as any).L
          const opts = markerIconRef.current ? { icon: markerIconRef.current } : undefined
          if (L) {
            if (markerAddRef.current) markerAddRef.current.setLatLng([latitude, longitude])
            else markerAddRef.current = L.marker([latitude, longitude], opts).addTo(map)
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
    setAreaSearch("")
    setLocationSearch("")
    if (markerAddRef.current && leafletAddRef.current) {
      try {
        leafletAddRef.current.removeLayer(markerAddRef.current)
      } catch (e) {}
      markerAddRef.current = null
    }
  }

  const handleAddSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" })
      return
    }
    if (lat == null || lng == null) {
      toast({ title: "Selecione a localização", variant: "destructive" })
      return
    }
    try {
      const payload = { descricao: nome.trim(), coordinates: [lat, lng] as [number, number] }
      const created = await pontoService.createPonto(payload)
      const novo: PontoVenda = {
        id: created._id,
        nome: created.descricao,
        lat: created.coordinates?.coordinates?.[0],
        lng: created.coordinates?.coordinates?.[1],
        qrCodeLink: created.qrCodeLink,
      }
      setPontos((prev) => [novo, ...prev])
      resetForm()
      setIsAddOpen(false)
      toast({ title: "Ponto criado com sucesso" })
    } catch (err: any) {
      toast({ title: "Erro ao criar ponto", description: err?.message, variant: "destructive" })
    }
  }

  const removePonto = async (id: string) => {
    const prev = pontos
    setPontos((cur) => cur.filter((p) => p.id !== id))
    setQrCache((c) => {
      const copy = { ...c }
      delete copy[id]
      return copy
    })
    try {
      await pontoService.deletePonto(id)
      toast({ title: "Ponto removido" })
    } catch (err: any) {
      setPontos(prev)
      toast({ title: "Erro ao remover", variant: "destructive" })
    }
  }

  const payloadFor = (p: PontoVenda) => p.qrCodeLink || ""

  const dataURLToBlob = (dataurl: string) => {
    const arr = dataurl.split(",")
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) u8arr[n] = bstr.charCodeAt(n)
    return new Blob([u8arr], { type: mime })
  }

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
        const nomeArquivo = `${slugify(p.nome)}_${p.id}.png`
        zip.file(nomeArquivo, blob)
      } catch (err) {
        console.error(err)
      }
    }
    try {
      const content = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(content)
      const a = document.createElement("a")
      a.href = url
      a.download = `qrcodes-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: "ZIP gerado" })
    } catch (err) {
      toast({ title: "Erro ao gerar ZIP", variant: "destructive" })
    }
  }

  // Gerar QRs para pontos visíveis
  useEffect(() => {
    let mounted = true
    ;(async () => {
      for (const p of pontos) {
        if (!qrCache[p.id]) {
          try {
            const dataUrl = await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
            if (!mounted) return
            setQrCache((c) => ({ ...c, [p.id]: dataUrl }))
          } catch (err) {
            console.error(err)
          }
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [pontos, qrCache])

  // Filtrar e paginar
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MaterialIcon icon="location_on" className="text-orange-600" />
          Distribuição — Pontos de Venda
        </h1>
        <p className="text-muted-foreground mt-2">
          Cadastre e visualize pontos de venda, gere códigos QR personalizados
        </p>
      </div>

      {/* Ações principais */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <MaterialIcon icon="add_location" className="mr-2" />
              Adicionar Ponto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Ponto de Venda</DialogTitle>
              <DialogDescription>Pesquise uma área ou endereço específico</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Pesquisa de áreas (bairros, regiões) */}
              <div className="space-y-2">
                <Label>🏘️ Pesquisar Área (Bairro/Região)</Label>
                <div className="flex gap-2">
                  <Input
                    value={areaSearch}
                    onChange={(e) => setAreaSearch(e.target.value)}
                    placeholder="Ex: Talatona, Viana, Morro Bento..."
                    onKeyDown={(e) => e.key === "Enter" && handleAreaSearch()}
                  />
                  <Button type="button" onClick={handleAreaSearch} disabled={areaLoading || !areaSearch.trim()}>
                    {areaLoading ? "..." : <MaterialIcon icon="search" />}
                  </Button>
                </div>
                {areaError && <p className="text-xs text-destructive">{areaError}</p>}

                {areaSuggestions.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-auto bg-muted/50">
                    {areaSuggestions.map((area, idx) => (
                      <div
                        key={idx}
                        className="p-2 cursor-pointer hover:bg-primary/10 border-b text-sm"
                        onClick={() => selectArea(area)}
                      >
                        <div className="font-medium line-clamp-1">{area.display_name.split(",")[0]}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{area.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pesquisa de localização específica */}
              <div className="space-y-2">
                <Label>📍 Pesquisar Endereço Específico</Label>
                <div className="flex gap-2">
                  <Input
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    placeholder="Ex: Rua Principal, Avenida..."
                    onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                  />
                  <Button type="button" onClick={handleLocationSearch} disabled={locationLoading || !locationSearch.trim()}>
                    {locationLoading ? "..." : <MaterialIcon icon="search" />}
                  </Button>
                </div>
                {locationError && <p className="text-xs text-destructive">{locationError}</p>}

                {locationSuggestions.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-auto bg-muted/50">
                    {locationSuggestions.map((loc, idx) => (
                      <div
                        key={idx}
                        className="p-2 cursor-pointer hover:bg-primary/10 border-b text-sm"
                        onClick={() => selectLocation(loc)}
                      >
                        <div className="font-medium line-clamp-1">{loc.display_name.split(",")[0]}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{loc.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dados do ponto */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do ponto" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone" />
                </div>
              </div>

              <div>
                <Label>Endereço</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Endereço completo" />
              </div>

              {/* Botão minha localização */}
              <Button type="button" variant="outline" onClick={handleUseMyLocation} className="w-full">
                <MaterialIcon icon="my_location" className="mr-2" />
                Usar minha localização
              </Button>

              {/* Mapa */}
              <div>
                <Label>Clique no mapa para ajustar a localização</Label>
                <div className="h-80 w-full rounded-lg border" ref={mapAddRef} />
                <div className="mt-2 text-xs text-muted-foreground">
                  📍 Lat: {lat?.toFixed(6) ?? "-"} | Lng: {lng?.toFixed(6) ?? "-"}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit">Salvar Ponto</Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => resetForm()}>Cancelar</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <MaterialIcon icon="map" className="mr-2" />
              Ver Mapa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Mapa de Pontos de Venda</DialogTitle>
            </DialogHeader>
            <div className="flex-1 flex gap-4 min-h-0">
              {/* Mapa */}
              <div className="flex-1 rounded-lg border overflow-hidden">
                <div ref={mapMainRef} className="h-full w-full" />
              </div>

              {/* Painel lateral */}
              <div className="w-96 border rounded-lg bg-card flex flex-col">
                {selectedPoint ? (
                  <div className="p-4 space-y-4 overflow-auto flex-1">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedPoint.nome}</h3>
                      <p className="text-sm text-muted-foreground">{selectedPoint.endereco ?? "-"}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div><strong>Telefone:</strong> {selectedPoint.telefone ?? "-"}</div>
                      <div><strong>Lat/Lng:</strong> {selectedPoint.lat} / {selectedPoint.lng}</div>
                      <div><strong>Status:</strong> {selectedPoint.isActive ? "✅ Ativo" : "❌ Inativo"}</div>
                      <div><strong>Criado:</strong> {selectedPoint.createdAt ? new Date(selectedPoint.createdAt).toLocaleString("pt-AO") : "-"}</div>
                    </div>

                    {qrCache[selectedPoint.id] && (
                      <div>
                        <p className="text-sm font-medium mb-2">QR Code</p>
                        <img src={qrCache[selectedPoint.id]} alt="QR" className="w-full border rounded" />
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                          try {
                            const dataUrl = qrCache[selectedPoint.id] || await QRCode.toDataURL(payloadFor(selectedPoint))
                            const a = document.createElement("a")
                            a.href = dataUrl
                            a.download = `${slugify(selectedPoint.nome)}.png`
                            a.click()
                          } catch (err) {
                            console.error(err)
                          }
                        }}
                      >
                        <MaterialIcon icon="download" className="mr-2" />
                        Baixar QR
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          removePonto(selectedPoint.id)
                          setSelectedPoint(null)
                        }}
                      >
                        <MaterialIcon icon="delete" className="mr-2" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Clique em um marker no mapa
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMapOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={downloadAllAsZip} disabled={pontos.length === 0}>
          <MaterialIcon icon="archive" className="mr-2" />
          Baixar todos (ZIP)
        </Button>
      </div>

      {/* Barra de pesquisa */}
      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <MaterialIcon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, endereço ou telefone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="pl-10"
          />
        </div>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
          className="px-3 py-2 border rounded-lg bg-background"
        >
          <option value={9}>9 por página</option>
          <option value={12}>12 por página</option>
          <option value={20}>20 por página</option>
        </select>
      </div>

      {/* Grid de pontos */}
      {pontos.length === 0 ? (
        <Card className="text-center py-12">
          <MaterialIcon icon="location_off" className="text-5xl text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum ponto cadastrado</p>
        </Card>
      ) : paginated.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">Nenhum resultado encontrado</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginated.map((p) => (
              <Card key={p.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <img src="/simbolo.png" alt="Logo" className="h-10 w-10 rounded" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">{p.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.endereco ?? "-"}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div>📍 {p.lat?.toFixed(4)} / {p.lng?.toFixed(4)}</div>
                    <div>☎️ {p.telefone ?? "-"}</div>
                    <div>{p.isActive ? "✅ Ativo" : "⚠️ Inativo"}</div>
                  </div>

                  {qrCache[p.id] && (
                    <div className="border rounded overflow-hidden">
                      <img src={qrCache[p.id]} alt="QR" className="w-full" />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={async () => {
                        try {
                          const dataUrl = qrCache[p.id] || await QRCode.toDataURL(payloadFor(p))
                          const a = document.createElement("a")
                          a.href = dataUrl
                          a.download = `${slugify(p.nome)}.png`
                          a.click()
                        } catch (err) {
                          console.error(err)
                        }
                      }}
                    >
                      <MaterialIcon icon="download" className="text-sm" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => removePonto(p.id)}
                    >
                      <MaterialIcon icon="delete" className="text-sm" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                <MaterialIcon icon="first_page" />
              </Button>
              <Button size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Próxima
              </Button>
              <Button size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                <MaterialIcon icon="last_page" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function payloadFor(p: PontoVenda) {
  return p.qrCodeLink || ""
}

function dataURLToBlob(dataurl: string) {
  const arr = dataurl.split(",")
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new Blob([u8arr], { type: mime })
}

function slugify(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}
