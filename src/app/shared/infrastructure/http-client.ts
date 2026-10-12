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

/** Código HTTP de un error rechazado por el cliente (el cuerpo `ApiError` del backend trae `status`). */
export function errorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : undefined
}

/**
 * Código de error del backend (`ApiError.error`, p. ej. `CAMERA_MAC_ALREADY_REGISTERED`). En los
 * errores por defecto de Spring este campo es la frase HTTP ("Bad Request"), que no casa con ningún
 * código: quien lo use debe tener un respaldo por `errorStatus`.
 */
export function errorCode(error: unknown): string | undefined {
  const code = (error as { error?: unknown } | null)?.error
  return typeof code === 'string' ? code : undefined
}

async function request<T>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
  const response = await api.request<T>({ ...config, ...options } as AppRequestConfig)
  return response.data
}

interface FormOptions extends RequestOptions {
  /** Fracción subida, de 0 a 1. */
  onUploadProgress?: (fraction: number) => void
}

/**
 * POST multipart/form-data. La instancia fija `Content-Type: application/json`, y con esa cabecera
 * axios convierte el FormData a JSON (el File se pierde). Con `multipart/form-data` lo deja tal cual
 * y, en el navegador, quita la cabecera para que el browser añada el boundary.
 */
function postForm<T>(path: string, form: FormData, options?: FormOptions): Promise<T> {
  const { onUploadProgress, ...rest } = options ?? {}
  return request<T>({
    method:  'POST',
    url:     path,
    data:    form,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onUploadProgress
      ? (e) => { if (e.total) onUploadProgress(e.loaded / e.total) }
      : undefined,
  }, rest)
}

export const httpClient = {
  get:    <T>(path: string, options?: RequestOptions)                 => request<T>({ method: 'GET',    url: path },       options),
  post:   <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>({ method: 'POST',   url: path, data: body }, options),
  put:    <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>({ method: 'PUT',    url: path, data: body }, options),
  patch:  <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>({ method: 'PATCH',  url: path, data: body }, options),
  delete: <T>(path: string, options?: RequestOptions)                 => request<T>({ method: 'DELETE', url: path },       options),
  postForm,
}
