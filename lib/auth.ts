// Authentication service for backend integration
export interface AccessItem {
  PageName: string
  icon: string
  Route: string
  _id: string
}

export interface Cargo {
  _id: string
  titulo: string
  descricao: string
  toFuncionario: boolean
  access: AccessItem[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  __v: number
}

export interface User {
  _id: string
  nome: string
  sobrenome: string
  email: string
  cargo: Cargo
  telefone: string
  isActive: boolean
}

export interface UserData {
  token: string
  user: User
  estabelecimentoId?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3333'

// Login function that integrates with backend
export async function login(email: string, password: string): Promise<UserData> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth?TIPO=FUNCIONARIO`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Tratamento específico por status HTTP
      switch (response.status) {
        case 401:
          throw new Error('Email ou senha incorretos')
        case 403:
          throw new Error('Acesso negado. Verifique suas permissões.')
        case 404:
          throw new Error('Serviço de autenticação não encontrado')
        case 500:
          throw new Error('Erro interno do servidor. Tente novamente mais tarde.')
        default:
          throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`)
      }
    }

    const userData: UserData = await response.json()
    
    // Validar se a resposta tem a estrutura esperada
    if (!userData.token || !userData.user || !userData.user.email) {
      throw new Error('Resposta inválida do servidor')
    }
    
    return userData
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está rodando.')
    }
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error('Erro inesperado ao fazer login')
  }
}

export function getStoredUser(): UserData | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("user")
  return stored ? JSON.parse(stored) : null
}

export function storeUser(userData: UserData) {
  if (typeof window === "undefined") return
  localStorage.setItem("user", JSON.stringify(userData))
}

// Logout function with optional backend call
export async function logout(): Promise<void> {
  const userData = getStoredUser()
  
  if (userData?.token) {
    try {
      // Tentar fazer logout no backend (opcional, pode falhar silenciosamente)
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.token}`,
        },
      })
    } catch (error) {
      // Logout no backend falhou, mas continuamos com o logout local
      console.warn('Falha ao fazer logout no backend:', error)
    }
  }
  
  // Sempre limpar os dados locais
  clearUser()
}

export function clearUser() {
  if (typeof window === "undefined") return
  localStorage.removeItem("user")
}
