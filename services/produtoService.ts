import { apiFetch } from "@/lib/api"

export interface ProdutoEmpresaItem {
  _id: string
  produtoId: {
    _id: string
    descricao?: string
    tipo?: string
    capacidade?: number
    preco?: number
    urls?: string[]
    fornecedor?: string
    createdAt?: string
  }
  quantidade: number
  preco?: number
  disponibilidade?: string
  createdAt?: string
  // ...other fields...
}

export interface DashboardResponse {
  total: number
  alertas: number
  totalAkz: number
}

export interface UpdateProdutoPayload {
  quantidade?: number
  preco?: number
  disponibilidade?: "disponivel" | "indisponivel"
}

export async function getProdutosEmpresa(): Promise<ProdutoEmpresaItem[]> {
  const res = await apiFetch<ProdutoEmpresaItem[]>("/empresas/produto-empresa/")
  return (res && res.data) || []
}

export async function getProdutosDashboard(): Promise<DashboardResponse> {
  const res = await apiFetch<DashboardResponse>("/empresas/produto-empresa/dashboard/all")
  return res.data || { total: 0, alertas: 0, totalAkz: 0 }
}

// Novo: PUT /empresas/produto-empresa/:id
export async function updateProdutoEmpresa(id: string, payload: UpdateProdutoPayload): Promise<ProdutoEmpresaItem> {
  const res = await apiFetch<ProdutoEmpresaItem>(`/empresas/produto-empresa/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return res.data
}
