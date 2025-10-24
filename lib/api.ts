export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3333"

import { getStoredUser } from "./auth"

export interface ApiResponse<T> {
  success?: boolean
  message?: string
  data: T
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = getStoredUser()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init && init.headers ? (init.headers as HeadersInit) : {}),
  }

  if (user?.token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${user.token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = (errorData && (errorData.message || errorData.error)) || `${response.status} ${response.statusText}`
    throw new Error(message)
  }

  return (await response.json()) as T
}




