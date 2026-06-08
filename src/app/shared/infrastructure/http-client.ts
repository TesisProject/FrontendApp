import { env } from '../../../environments/env'
import { tokenRepository } from './token-repository'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  skipAuth?: boolean
}

async function request<T>(method: HttpMethod, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  const token = options?.skipAuth ? null : tokenRepository.getAccessToken()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw error
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const httpClient = {
  get:    <T>(path: string, options?: RequestOptions)                 => request<T>('GET',    path, undefined, options),
  post:   <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST',   path, body,      options),
  put:    <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT',    path, body,      options),
  patch:  <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH',  path, body,      options),
  delete: <T>(path: string, options?: RequestOptions)                 => request<T>('DELETE', path, undefined, options),
}
