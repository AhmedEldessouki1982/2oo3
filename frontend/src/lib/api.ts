import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason: any) => void }> = []

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearTokens()
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        })
        setTokens(data.accessToken, data.refreshToken)
        processQueue(null, data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export interface AuthResponse {
  user: {
    id: string
    email: string
    displayName: string
    role: string
    createdAt: string
  }
  accessToken: string
  refreshToken: string
}

export async function loginApi(email: string, password: string) {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

export async function registerApi(
  email: string,
  password: string,
  displayName: string,
) {
  const { data } = await api.post<AuthResponse>('/auth/register', {
    email,
    password,
    displayName,
  })
  return data
}

export async function refreshApi(refreshToken: string) {
  const { data } = await api.post<{ accessToken: string; refreshToken: string }>(
    '/auth/refresh',
    { refreshToken },
  )
  return data
}

export async function logoutApi(refreshToken: string) {
  const { data } = await api.post<{ message: string }>('/auth/logout', {
    refreshToken,
  })
  return data
}

export async function getMeApi() {
  const { data } = await api.get<{
    id: string
    email: string
    displayName: string
    role: string
    createdAt: string
  }>('/auth/me')
  return data
}
