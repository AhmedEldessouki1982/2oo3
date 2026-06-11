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

api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      'success' in response.data
    ) {
      response.data = response.data.data
    }
    return response
  },
)

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
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        })
        const inner = response.data?.data ?? response.data
        setTokens(inner.accessToken, inner.refreshToken)
        processQueue(null, inner.accessToken)
        originalRequest.headers.Authorization = `Bearer ${inner.accessToken}`
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

export type ConversationType = 'COMMISSIONING' | 'CHAT'

export interface ConversationSummary {
  id: string
  title: string
  type: ConversationType
  status: string
  lastCompressedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedConversations {
  items: ConversationSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProviderResponseBrief {
  id: string
  provider: string
  status: string
  content: string | null
  errorSummary: string | null
  latencyMs: number | null
}

export interface MessageBrief {
  id: string
  role: string
  content: string
  compressed: boolean
  createdAt: string
  providerResponses: ProviderResponseBrief[]
}

export interface AttachmentBrief {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number | null
  extractionStatus: string
  createdAt: string
}

export interface ConversationDetail {
  id: string
  title: string
  type: ConversationType
  status: string
  contextSummary: string | null
  lastCompressedAt: string | null
  createdAt: string
  updatedAt: string
  attachments: AttachmentBrief[]
  messages: MessageBrief[]
}

export interface CreateMessageResult {
  message: {
    id: string
    role: string
    content: string
    createdAt: string
  }
  providerResponses: Array<{
    id: string
    provider: string
    status: string
  }>
}

export async function createConversation(title: string, type?: ConversationType) {
  const { data } = await api.post<ConversationSummary>('/conversations', { title, type })
  return data
}

export async function listConversations(params?: { search?: string; page?: number; limit?: number }) {
  const { data } = await api.get<PaginatedConversations>('/conversations', { params })
  return data
}

export async function getConversation(id: string, messagesLimit?: number) {
  const params = messagesLimit ? { messagesLimit } : undefined
  const { data } = await api.get<ConversationDetail>(`/conversations/${id}`, { params })
  return data
}

export async function updateConversation(id: string, title: string) {
  const { data } = await api.patch<ConversationSummary>(`/conversations/${id}`, { title })
  return data
}

export async function deleteConversation(id: string) {
  await api.delete(`/conversations/${id}`)
}

export async function sendMessage(conversationId: string, content: string, attachmentIds?: string[]) {
  const { data } = await api.post<CreateMessageResult>(
    `/conversations/${conversationId}/messages`,
    { content, attachmentIds },
  )
  return data
}

export interface AttachmentUploadResult {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
}

export async function uploadAttachment(conversationId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<AttachmentUploadResult>(
    `/conversations/${conversationId}/attachments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}

export async function listAttachments(conversationId: string) {
  const { data } = await api.get<AttachmentBrief[]>(
    `/conversations/${conversationId}/attachments`,
  )
  return data
}

export async function deleteAttachment(id: string) {
  await api.delete(`/attachments/${id}`)
}

export interface PaginatedMessages {
  items: MessageBrief[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getMessages(conversationId: string, params?: { page?: number; limit?: number }) {
  const { data } = await api.get<PaginatedMessages>(
    `/conversations/${conversationId}/messages`,
    { params },
  )
  return data
}

export interface ComparisonSection {
  title: string
  findings: string[]
  severity?: 'info' | 'warning' | 'critical'
}

export interface ComparisonResult {
  id: string
  status: string
  agreements: ComparisonSection[]
  disagreements: ComparisonSection[]
  uniqueInsights: ComparisonSection[]
  risks: ComparisonSection[]
  nextInvestigations: ComparisonSection[]
  errorSummary: string | null
  createdAt: string
  updatedAt: string
}

export async function getComparison(messageId: string) {
  const { data } = await api.get<ComparisonResult | null>(
    `/comparison/${messageId}`,
  )
  return data
}

/* Provider Credentials */

export interface ProviderCredential {
  id: string
  provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE'
  enabled: boolean
  keyFingerprint: string | null
  createdAt: string
  updatedAt: string
}

export interface ProviderHealth {
  provider: string
  configured: boolean
  enabled?: boolean
  healthy: boolean
  message: string
}

export async function listCredentials() {
  const { data } = await api.get<ProviderCredential[]>('/credentials')
  return data
}

export async function createCredential(provider: string, apiKey: string) {
  const { data } = await api.post<ProviderCredential>('/credentials', { provider, apiKey })
  return data
}

export async function updateCredential(provider: string, apiKey: string) {
  const { data } = await api.put<ProviderCredential>(`/credentials/${provider}`, { apiKey })
  return data
}

export async function toggleCredential(provider: string) {
  const { data } = await api.patch<ProviderCredential>(`/credentials/${provider}/toggle`)
  return data
}

export async function deleteCredential(provider: string) {
  await api.delete(`/credentials/${provider}`)
}

export async function checkCredentialHealth(provider: string) {
  const { data } = await api.get<ProviderHealth>(`/credentials/${provider}/health`)
  return data
}
