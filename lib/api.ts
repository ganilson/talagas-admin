export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

import { getStoredUser } from "./auth"

export interface ApiResponse<T> {
  success?: boolean
  message?: string
  data: T
}

type RequestInterceptor = (url: string, init: RequestInit) => Promise<[string, RequestInit]> | [string, RequestInit]
type ResponseInterceptor = (response: any) => Promise<any> | any

let authToken: string | null = null
const requestInterceptors: RequestInterceptor[] = []
const responseInterceptors: ResponseInterceptor[] = []

export function setAuthToken(token?: string | null) {
  authToken = token ?? null
}

export function clearAuthToken() {
  authToken = null
}

export function addRequestInterceptor(fn: RequestInterceptor) {
  requestInterceptors.push(fn)
}

export function addResponseInterceptor(fn: ResponseInterceptor) {
  responseInterceptors.push(fn)
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  // Monta URL completa
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`

  // Pega token: primeiro token configurado manualmente, senão do stored user
  const user = getStoredUser()
  const token = authToken ?? user?.token

  // Cabeçalhos base
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers ? (init.headers as HeadersInit) : {}),
  }

  if (token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  let reqInit: RequestInit = {
    ...init,
    headers,
  }

  let finalUrl = url

  // Aplicar interceptors de request em série
  for (const interceptor of requestInterceptors) {
    // interceptor pode retornar [url, init] modificado
    // garantir que sempre retornamos um tuple
    // eslint-disable-next-line no-await-in-loop
    const out = await interceptor(finalUrl, reqInit)
    if (Array.isArray(out) && out.length === 2) {
      finalUrl = out[0]
      reqInit = out[1]
    }
  }

  const response = await fetch(finalUrl, reqInit)
  const parsed = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = (parsed && (parsed.message || parsed.error)) || `${response.status} ${response.statusText}`
    // permitir interceptors de resposta receberem erro bruto antes de lançar
    for (const rInterceptor of responseInterceptors) {
      // eslint-disable-next-line no-await-in-loop
      await rInterceptor(parsed)
    }
    throw new Error(message)
  }

  // Aplicar interceptors de resposta (podem alterar parsed)
  let finalParsed: any = parsed
  for (const rInterceptor of responseInterceptors) {
    // eslint-disable-next-line no-await-in-loop
    finalParsed = await rInterceptor(finalParsed)
  }

  return finalParsed as ApiResponse<T>
}




