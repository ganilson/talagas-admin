import { apiFetch } from "./api"
import { getStoredUser } from "./auth"
import type { CargoItem } from "./cargos"

export interface FuncionarioPayload {
  estabelecimentoId: string
  cargoId: string
  nome: string
  sobrenome: string
  telefone: string
  email: string
  endereco?: string
  genero?: string
  dataDeNascimento?: string
  fotoPerfil?: string
}

// Estrutura retornada no GET (usuarioId e cargoId são objetos)
export interface Funcionario {
  _id: string
  estabelecimentoId: string
  usuarioId: {
    _id: string
    nome: string
    sobrenome: string
    telefone: string
    email: string
    endereco?: string
    genero?: string
    dataDeNascimento?: string
    fotoPerfil?: string
    isActive?: boolean
  }
  cargoId: CargoItem
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

const BASE = "/adminGeral/funcionarios"

export async function listarFuncionarios(): Promise<Funcionario[]> {
  const user = getStoredUser()
  const estabelecimentoId = (user?.estabelecimentoId || (user as any)?.user?.estabelecimentoId || "").toString()
  const query = estabelecimentoId ? `?estabelecimentoId=${encodeURIComponent(estabelecimentoId)}` : ""
  const res = await apiFetch<{ success: boolean; data: Funcionario[]; pagination?: unknown }>(`${BASE}${query}`)
  return res.data
}

export async function criarFuncionario(payload: FuncionarioPayload): Promise<Funcionario> {
  const res = await apiFetch<{ data: Funcionario }>(`${BASE}`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function atualizarFuncionario(id: string, payload: Partial<FuncionarioPayload>): Promise<Funcionario> {
  const res = await apiFetch<{ data: Funcionario }>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function removerFuncionario(id: string): Promise<void> {
  await apiFetch<unknown>(`${BASE}/${id}`, { method: "DELETE" })
}


