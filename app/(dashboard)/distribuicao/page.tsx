"use client"

import { useEffect, useMemo, useState } from "react"
import Map, { Marker, NavigationControl, GeolocateControl } from "react-map-gl/maplibre"
import "mapbox-gl/dist/mapbox-gl.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { MaterialIcon } from "@/components/material-icon"
import QRCode from "qrcode"
import JSZip from "jszip"
import * as pontoService from "@/services/pontoService"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const QR_SIZE = 300

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

export default function DistribuicaoPage() {
  const { toast } = useToast()
  const [pontos, setPontos] = useState<PontoVenda[]>([])
  const [selectedPoint, setSelectedPoint] = useState<PontoVenda | null>(null)
  const [qrCache, setQrCache] = useState<Record<string, string>>({})

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false)
  const [isListModalOpen, setIsListModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [nome, setNome] = useState("")
  const [endereco, setEndereco] = useState("")
  const [telefone, setTelefone] = useState("")
  const [tempLat, setTempLat] = useState<number | undefined>(undefined)
  const [tempLng, setTempLng] = useState<number | undefined>(undefined)
  const [isFormEnabled, setIsFormEnabled] = useState(false)

  const [locationSearch, setLocationSearch] = useState("")
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])

  const [viewState, setViewState] = useState({
    latitude: -8.8383,
    longitude: 13.2344,
    zoom: 12
  })

  useEffect(() => {
    loadPontos()
  }, [])

  const loadPontos = async () => {
    try {
      const raw = await pontoService.getPontos()
      const mapped = raw.map((r: any) => ({
        id: r._id,
        nome: r.descricao,
        endereco: r.endereco,
        telefone: r.telefone || "",
        lat: r.coordinates?.coordinates?.[0],
        lng: r.coordinates?.coordinates?.[1],
        qrCodeLink: r.qrCodeLink,
        isActive: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
      setPontos(mapped)
      console.log('✅ Pontos carregados:', mapped.length)
      mapped.forEach((p: PontoVenda) => console.log(`  ${p.nome}: [lng=${p.lng}, lat=${p.lat}]`))
    } catch (err) {
      console.error("Erro ao carregar pontos:", err)
      const local = localStorage.getItem("pontos_venda")
      if (local) setPontos(JSON.parse(local))
    }
  }

  useEffect(() => {
    localStorage.setItem("pontos_venda", JSON.stringify(pontos))
  }, [pontos])

  const handleLocationSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!locationSearch.trim()) return

    setLocationLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch + ", Angola")}&limit=5`,
        { headers: { "Accept-Language": "pt" } }
      )
      const results = await response.json()
      setLocationSuggestions(results)
    } catch (err) {
      console.error(err)
      toast({ title: "Erro na pesquisa", variant: "destructive" })
    } finally {
      setLocationLoading(false)
    }
  }

  const selectLocation = (loc: any) => {
    const newLat = parseFloat(loc.lat)
    const newLng = parseFloat(loc.lon)

    setTempLat(newLat)
    setTempLng(newLng)
    setEndereco(loc.display_name)
    setNome(loc.display_name.split(",")[0])
    setLocationSuggestions([])
    setLocationSearch("")
    setIsFormEnabled(true)
  }

  const handleMapClick = (evt: any) => {
    if (!isLeftSidebarOpen) return

    const { lat, lng } = evt.lngLat
    setTempLat(lat)
    setTempLng(lng)
    setIsFormEnabled(true)
  }

  const handleAddSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!nome.trim() || tempLat === undefined || tempLng === undefined) {
      toast({ title: "Preencha nome e localização", variant: "destructive" })
      return
    }

    try {
      const payload = {
        descricao: nome.trim(),
        coordinates: [tempLat, tempLng] as [number, number],
        endereco,
        telefone
      }
      const created = await pontoService.createPonto(payload)

      const novo: PontoVenda = {
        id: created._id,
        nome: created.descricao,
        lat: created.coordinates?.coordinates?.[0],
        lng: created.coordinates?.coordinates?.[1],
        qrCodeLink: created.qrCodeLink,
        endereco: created.endereco,
        telefone: created.telefone
      }

      setPontos((prev) => [novo, ...prev])
      resetRegistrationForm()
      setIsLeftSidebarOpen(false)
      toast({ title: "✅ Ponto criado!" })
    } catch (err: any) {
      toast({ title: "Erro ao criar ponto", description: err?.message, variant: "destructive" })
    }
  }

  const resetRegistrationForm = () => {
    setNome("")
    setEndereco("")
    setTelefone("")
    setTempLat(undefined)
    setTempLng(undefined)
    setLocationSearch("")
    setLocationSuggestions([])
    setIsFormEnabled(false)
  }

  const removePonto = async (id: string) => {
    try {
      await pontoService.deletePonto(id)
      setPontos(cur => cur.filter(p => p.id !== id))
      toast({ title: "Ponto removido" })
      if (selectedPoint?.id === id) {
        setSelectedPoint(null)
        setIsRightSidebarOpen(false)
      }
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" })
    }
  }

  const payloadFor = (p: PontoVenda) => p.qrCodeLink || `https://talagas.com/p/${p.id}`

  useEffect(() => {
    pontos.forEach(async (p) => {
      if (!qrCache[p.id]) {
        try {
          const url = await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
          setQrCache(prev => ({ ...prev, [p.id]: url }))
        } catch (e) { console.error(e) }
      }
    })
  }, [pontos, qrCache])

  const downloadQR = (p: PontoVenda) => {
    const url = qrCache[p.id]
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.download = `qr-${p.nome.replace(/\s+/g, "-").toLowerCase()}.png`
    a.click()
  }

  const downloadAllAsZip = async () => {
    if (pontos.length === 0) {
      toast({ title: "Nenhum ponto cadastrado", variant: "destructive" })
      return
    }

    toast({ title: "Gerando ZIP...", description: "Aguarde" })
    const zip = new JSZip()

    for (const p of pontos) {
      try {
        const dataUrl = qrCache[p.id] || await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
        const arr = dataUrl.split(",")
        const mime = arr[0].match(/:(.*?);/)![1]
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) u8arr[n] = bstr.charCodeAt(n)
        const blob = new Blob([u8arr], { type: mime })

        const fileName = `${p.nome.replace(/\s+/g, "-").toLowerCase()}_${p.id}.png`
        zip.file(fileName, blob)
      } catch (err) {
        console.error(`Erro ao gerar QR para ${p.nome}:`, err)
      }
    }

    try {
      const content = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(content)
      const a = document.createElement("a")
      a.href = url
      a.download = `qrcodes-talagas-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: "ZIP gerado!" })
    } catch (err) {
      toast({ title: "Erro ao gerar ZIP", variant: "destructive" })
    }
  }

  const filteredPontos = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return pontos.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.endereco || "").toLowerCase().includes(q)
    )
  }, [pontos, searchQuery])

  const handleMarkerClick = (point: PontoVenda) => {
    if (isLeftSidebarOpen) return
    setSelectedPoint(point)
    setIsRightSidebarOpen(true)
  }

  return (
    <div className="relative h-screen w-full">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        cursor={isLeftSidebarOpen ? 'crosshair' : 'grab'}
        doubleClickZoom={!isLeftSidebarOpen}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {filteredPontos.map(p => {
          if (!p.lat || !p.lng) {
            console.warn('⚠️ Ponto sem coordenadas:', p.nome, p)
            return null
          }
          return (
            <Marker
              key={p.id}
              longitude={p.lng}
              latitude={p.lat}
              color={selectedPoint?.id === p.id ? "#FF8A00" : "#666"}
              onClick={e => {
                e.originalEvent.stopPropagation()
                handleMarkerClick(p)
              }}
            />
          )
        })}

        {tempLat && tempLng && isLeftSidebarOpen && (
          <Marker longitude={tempLng} latitude={tempLat} color="#22c55e" />
        )}
      </Map>

      <div className="absolute bottom-6 left-6 z-10 bg-background/95 backdrop-blur rounded-lg shadow-xl p-4 border max-w-xs">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <MaterialIcon icon="info" className="text-primary" />
          Legenda
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#666]" />
            <span>Ponto Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF8A00]" />
            <span>Ponto Selecionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span>Novo Ponto (Cadastro)</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            Total: {pontos.length} {pontos.length === 1 ? 'ponto' : 'pontos'}
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
        <div className="relative">
          <MaterialIcon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar pontos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/95 backdrop-blur shadow-lg"
          />
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
        <Button
          size="lg"
          className="rounded-full shadow-xl h-14 w-14 p-0"
          onClick={() => {
            setIsLeftSidebarOpen(true)
            resetRegistrationForm()
          }}
        >
          <MaterialIcon icon="add_location" className="text-2xl" />
        </Button>

        <Button
          size="lg"
          variant="secondary"
          className="rounded-full shadow-xl h-14 w-14 p-0"
          onClick={() => setIsListModalOpen(true)}
        >
          <MaterialIcon icon="list" className="text-2xl" />
        </Button>
      </div>

      <Sheet open={isRightSidebarOpen} onOpenChange={setIsRightSidebarOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0">
          <ScrollArea className="h-full">
            {selectedPoint && (
              <div className="p-6 space-y-6">
                <SheetHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <SheetTitle className="text-2xl">{selectedPoint.nome}</SheetTitle>
                      <SheetDescription className="mt-2">
                        {selectedPoint.endereco || "Sem endereço"}
                      </SheetDescription>
                    </div>
                    <Badge variant={selectedPoint.isActive ? "default" : "secondary"}>
                      {selectedPoint.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </SheetHeader>

                <div className="space-y-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <MaterialIcon icon="phone" className="text-muted-foreground" />
                      <span>{selectedPoint.telefone || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MaterialIcon icon="location_on" className="text-muted-foreground" />
                      <span className="text-xs font-mono">
                        {selectedPoint.lng?.toFixed(6)}, {selectedPoint.lat?.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MaterialIcon icon="calendar_today" className="text-muted-foreground" />
                      <span>
                        {selectedPoint.createdAt ? new Date(selectedPoint.createdAt).toLocaleDateString("pt-AO") : "-"}
                      </span>
                    </div>
                  </div>

                  {qrCache[selectedPoint.id] && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">QR Code</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <img src={qrCache[selectedPoint.id]} alt="QR" className="w-full rounded border" />
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => downloadQR(selectedPoint)}
                    >
                      <MaterialIcon icon="download" className="mr-2" />
                      Baixar QR
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => removePonto(selectedPoint.id)}
                    >
                      <MaterialIcon icon="delete" className="mr-2" />
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={isLeftSidebarOpen} onOpenChange={(open) => {
        setIsLeftSidebarOpen(open)
        if (!open) resetRegistrationForm()
      }} modal={false}>
        <SheetContent side="left" className="w-full sm:w-[400px] p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <SheetHeader>
                <SheetTitle>Cadastrar Novo Ponto</SheetTitle>
                <SheetDescription>
                  Clique no mapa para marcar a localização exata
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg text-sm transition-all ${isFormEnabled
                  ? 'bg-green-50 dark:bg-green-950 border-2 border-green-500'
                  : 'bg-orange-50 dark:bg-orange-950 border-2 border-orange-500'
                  }`}>
                  <p className="font-medium mb-2 flex items-center gap-2">
                    {isFormEnabled ? (
                      <>
                        <MaterialIcon icon="check_circle" className="text-green-600" />
                        <span className="text-green-700 dark:text-green-300">Localização confirmada!</span>
                      </>
                    ) : (
                      <>
                        <MaterialIcon icon="touch_app" className="text-orange-600" />
                        <span className="text-orange-700 dark:text-orange-300">Clique no mapa</span>
                      </>
                    )}
                  </p>
                  {!isFormEnabled && (
                    <p className="text-xs text-muted-foreground">
                      Clique em qualquer lugar do mapa para marcar as coordenadas. Você pode clicar várias vezes para ajustar.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Pesquisar Endereço (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={locationSearch}
                      onChange={e => setLocationSearch(e.target.value)}
                      placeholder="Ex: Talatona..."
                      onKeyDown={e => e.key === "Enter" && handleLocationSearch()}
                    />
                    <Button size="icon" onClick={handleLocationSearch} disabled={locationLoading}>
                      <MaterialIcon icon="search" className={locationLoading ? "animate-spin" : ""} />
                    </Button>
                  </div>
                  {locationSuggestions.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto bg-popover">
                      {locationSuggestions.map((loc, i) => (
                        <div
                          key={i}
                          className="p-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                          onClick={() => selectLocation(loc)}
                        >
                          <div className="font-medium">{loc.display_name.split(",")[0]}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{loc.display_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {tempLat && tempLng && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">📍 Coordenadas selecionadas:</p>
                    <p className="text-sm font-mono">
                      Lng: {tempLng.toFixed(6)} | Lat: {tempLat.toFixed(6)}
                    </p>
                  </div>
                )}

                <fieldset disabled={!isFormEnabled} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Mercadinho Central" />
                  </div>

                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input value={endereco} onChange={e => setEndereco(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="+244 9..." />
                  </div>

                  <Button onClick={handleAddSubmit} className="w-full" disabled={!isFormEnabled}>
                    <MaterialIcon icon="save" className="mr-2" />
                    Salvar Ponto
                  </Button>
                </fieldset>

                {!isFormEnabled && (
                  <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
                    <MaterialIcon icon="info" className="mb-2 text-4xl" />
                    <p>Aguardando seleção no mapa</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={isListModalOpen} onOpenChange={setIsListModalOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <ScrollArea className="h-full">
            <div className="p-6">
              <SheetHeader className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle>Pontos Cadastrados</SheetTitle>
                    <SheetDescription>{pontos.length} total</SheetDescription>
                  </div>
                  <Button onClick={downloadAllAsZip} disabled={pontos.length === 0}>
                    <MaterialIcon icon="archive" className="mr-2" />
                    Baixar ZIP
                  </Button>
                </div>
              </SheetHeader>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pontos.map(p => (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      handleMarkerClick(p)
                      setIsListModalOpen(false)
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{p.nome}</CardTitle>
                        {p.isActive ? (
                          <MaterialIcon icon="check_circle" className="text-green-500 text-sm" />
                        ) : (
                          <MaterialIcon icon="cancel" className="text-red-500 text-sm" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                      <p className="line-clamp-1">{p.endereco || "Sem endereço"}</p>
                      <p>{p.telefone || "-"}</p>
                      <p className="text-xs font-mono">
                        {p.lng?.toFixed(4)}, {p.lat?.toFixed(4)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}
