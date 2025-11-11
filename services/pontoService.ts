import { apiFetch, ApiResponse } from "@/lib/api"

export interface RawPonto {
  _id: string
  descricao: string
  coordinates: { type: string; coordinates: [number, number] } // [lat, lng] conforme exemplo
  estabelecimentoId?: string
  isActive?: boolean
  qrCodeLink?: string
  createdAt?: string
  updatedAt?: string
}

export interface Ponto {
  id: string
  descricao: string
  lat?: number
  lng?: number
  qrCodeLink?: string
  raw?: RawPonto
}

export interface CreatePontoPayload {
  descricao: string
  coordinates: [number, number]
}

export interface UpdatePontoPayload {
  descricao?: string
  coordinates?: [number, number]
}

/**
 * GET /empresas/pontos
 */
export async function getPontos(): Promise<RawPonto[]> {
  const res = await apiFetch<RawPonto[]>("/empresas/pontos")
  return (res && (res.data as any)) || []
}

/**
 * POST /empresas/pontos
 */
export async function createPonto(payload: CreatePontoPayload): Promise<RawPonto> {
  const res = await apiFetch<RawPonto>("/empresas/pontos", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.data
}

/**
 * PUT /empresas/pontos/:id
 */
export async function updatePonto(id: string, payload: UpdatePontoPayload): Promise<RawPonto> {
  const res = await apiFetch<RawPonto>(`/empresas/pontos/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return res.data
}
