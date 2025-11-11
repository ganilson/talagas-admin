import { apiFetch } from "@/lib/api"

export interface PedidoProduto {
  _id: string
  quantidade: number
  produtoEmpresaId: {
    _id: string
    produtoId: string | { _id: string; descricao?: string }
    quantidade?: number
    preco?: number
    disponibilidade?: string
  }
}

export interface PontoDeAtendimento {
  _id: string
  descricao?: string
  telefone?: string
  endereco?: string
  coordinates?: { type: string; coordinates: [number, number] }
  qrCodeLink?: string
}

export interface Pedido {
  _id: string
  codigoPedido: string
  nomeCompleto?: string
  pontoDeAtendimento?: PontoDeAtendimento
  metodoPagamento?: string
  produtos?: PedidoProduto[]
  telefone?: string
  estabelecimentoId?: string
  total?: number
  status?: string
  createdAt?: string
  updatedAt?: string
  qrCodeLink?: string

}

export interface PaginationInfo {
  total: number
  page: number
  limit: number
  pages: number
}

export interface FilterPedidosParams {
  page?: number
  limit?: number
  status?: string
  codigoPedido?: string
}

/**
 * Consulta /empresas/pedidos/filtrar?page=...&limit=...&status=...&codigoPedido=...
 * Retorna { items, pagination }
 */
export async function filterPedidos(params: FilterPedidosParams) {
  const { page = 1, limit = 10, status, codigoPedido } = params
  const qp: string[] = []
  qp.push(`page=${page}`)
  qp.push(`limit=${limit}`)
  if (status) qp.push(`status=${encodeURIComponent(status)}`)
  if (codigoPedido) qp.push(`codigoPedido=${encodeURIComponent(codigoPedido)}`)
  const path = `/empresas/pedidos/filtrar?${qp.join("&")}`

  // apiFetch retorna o JSON inteiro; ex.: { success:true, data:[...], pagination: {...} }
  const res: any = await apiFetch<any>(path)
  const items: Pedido[] = res?.data ?? []
  const pagination: PaginationInfo | null = res?.pagination ?? null
  return { items, pagination }
}

export interface UpdatePedidoStatusPayload {
  status: "pendente" | "confirmado" | "entregue" | "cancelado"
}

export async function updatePedidoStatus(id: string, payload: UpdatePedidoStatusPayload): Promise<Pedido> {
  const res = await apiFetch<Pedido>(`/empresas/pedidos/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return res.data
}
