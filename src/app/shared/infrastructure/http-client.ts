import { env } from '../../../environments/env'
import { tokenRepository } from './token-repository'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const token = tokenRepository.getAccessToken()

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
  get:    <T>(path: string)                => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown) => request<T>('POST',   path, body),
  put:    <T>(path: string, body?: unknown) => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                => request<T>('DELETE', path),
}
