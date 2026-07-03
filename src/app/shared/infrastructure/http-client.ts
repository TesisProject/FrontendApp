import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { env } from '../../../environments/env'
import { tokenRepository } from './token-repository'

interface RequestOptions {
  skipAuth?: boolean
}

// Axios config extended with our per-request options.
type AppRequestConfig = InternalAxiosRequestConfig & RequestOptions

const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach the Bearer token unless the caller opted out.
api.interceptors.request.use((config: AppRequestConfig) => {
  if (!config.skipAuth) {
    const token = tokenRepository.getAccessToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// Response interceptor: on 401 the session is no longer valid, so we clear it
// and send the user to the matching login screen. Requests flagged skipAuth
// (sign-in, register, reset password...) are excluded so a wrong-credentials
// 401 does not trigger a redirect.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config as AppRequestConfig | undefined
    const status = error.response?.status

    if (status === 401 && !config?.skipAuth) {
      redirectToLogin()
    }

    // Preserve the previous error shape: throw the server-provided body when
    // available so existing catch blocks keep working.
    return Promise.reject(error.response?.data ?? error)
  },
)

function redirectToLogin(): void {
  tokenRepository.clear()

  const path      = window.location.pathname
  const isAdmin   = path.startsWith('/admin')
  const loginPath = isAdmin ? '/admin' : '/login'

  // Avoid redirect loops if we are already on the login screen.
  if (path === loginPath) return

  const returnUrl = window.location.pathname + window.location.search
  const query     = isAdmin ? '' : `?returnUrl=${encodeURIComponent(returnUrl)}`
  window.location.assign(`${loginPath}${query}`)
}

async function request<T>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
  const response = await api.request<T>({ ...config, ...options } as AppRequestConfig)
  return response.data
}

export const httpClient = {
  get:    <T>(path: string, options?: RequestOptions)                 => request<T>({ method: 'GET',    url: path },       options),
  post:   <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>({ method: 'POST',   url: path, data: body }, options),
  put:    <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>({ method: 'PUT',    url: path, data: body }, options),
  patch:  <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>({ method: 'PATCH',  url: path, data: body }, options),
  delete: <T>(path: string, options?: RequestOptions)                 => request<T>({ method: 'DELETE', url: path },       options),
}
