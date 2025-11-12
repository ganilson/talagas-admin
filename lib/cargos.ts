import { apiFetch } from "./api"

export interface CargoAccessItem {
  PageName: string
  icon: string
  Route: string
  _id: string
}

export interface CargoItem {
  _id: string
  titulo: string
  descricao: string
  toFuncionario: boolean
  access: CargoAccessItem[]
  isActive: boolean
  __v?: number
  createdAt?: string
  updatedAt?: string
}

export async function getCargosToFuncionario(): Promise<CargoItem[]> {
  const result = await apiFetch<{ success: boolean; data: CargoItem[] }>(`/adminGeral/cargos`)
  return result.data
}




