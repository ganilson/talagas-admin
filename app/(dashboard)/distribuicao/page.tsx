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
  DialogClose,
} from "@/components/ui/dialog"
import "leaflet/dist/leaflet.css"

type PontoVenda = {
  id: string
  nome: string
  endereco?: string
  telefone?: string
  lat?: number
  lng?: number
}

const QR_SIZE = 300

export default function DistribuicaoPage() {
  const [pontos, setPontos] = useState<PontoVenda[]>([])
  const { toast } = useToast()

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pontos_venda")
      if (raw) setPontos(JSON.parse(raw))
    } catch (e) {
      // ignore
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
          leafletMapRef.current = map

          map.on("click", (e: any) => {
            const { lat: clickedLat, lng: clickedLng } = e.latlng
            setLat(Number(clickedLat.toFixed(6)))
            setLng(Number(clickedLng.toFixed(6)))

            if (markerRef.current) {
              markerRef.current.setLatLng(e.latlng)
            } else {
              markerRef.current = L.marker(e.latlng).addTo(map)
            }
          })
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
          const L = (window as any).L
          if (L) {
            if (markerRef.current) markerRef.current.setLatLng([latitude, longitude])
            else markerRef.current = L.marker([latitude, longitude]).addTo(map)
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

  const handleAddSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" })
      return
    }
    const novo: PontoVenda = { id: gerarId(), nome: nome.trim(), endereco: endereco.trim() || undefined, telefone: telefone.trim() || undefined, lat, lng }
    setPontos((prev) => [novo, ...prev])
    resetForm()
    setIsAddOpen(false)
    toast({ title: "Ponto de venda adicionado" })
  }

  const removePonto = (id: string) => {
    setPontos((prev) => prev.filter((p) => p.id !== id))
    setQrCache((c) => {
      const copy = { ...c }
      delete copy[id]
      return copy
    })
    toast({ title: "Ponto removido" })
  }

  // QR helpers
  const payloadFor = (p: PontoVenda) => `talagas://ponto/${p.id}?nome=${encodeURIComponent(p.nome)}`

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

  // cache QR for items on current page
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
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginated])

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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Distribuição — Pontos de Venda</h1>
          <p className="text-sm text-muted-foreground">Cadastre pontos de venda e gere códigos QR para cada um.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>Adicionar Ponto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Ponto de Venda</DialogTitle>
                <DialogDescription>Preencha os dados e selecione a localização no mapa (clique no mapa).</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddSubmit} className="space-y-4">
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
        </div>
      </div>

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

      <div className="mt-6 overflow-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Endereço</th>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Lat</th>
              <th className="px-3 py-2">Lng</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 align-top">
                  <div className="font-medium">{p.nome}</div>
                </td>
                <td className="px-3 py-2 align-top text-sm text-muted-foreground">{p.endereco}</td>
                <td className="px-3 py-2 align-top text-sm text-muted-foreground">{p.telefone}</td>
                <td className="px-3 py-2 align-top text-sm">{p.lat ?? '-'}</td>
                <td className="px-3 py-2 align-top text-sm">{p.lng ?? '-'}</td>
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-2">
                    <a href={qrCache[p.id] ?? '#'} target="_blank" rel="noreferrer" className={`text-sm underline ${!qrCache[p.id] ? 'opacity-50 pointer-events-none' : ''}`}>Abrir QR</a>
                    <button
                      className="text-sm underline"
                      onClick={async () => {
                        try {
                          const dataUrl = qrCache[p.id] ?? await QRCode.toDataURL(payloadFor(p), { width: QR_SIZE })
                          const a = document.createElement('a')
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
                    <Button size="sm" variant="link" onClick={() => removePonto(p.id)}>Remover</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
