import axios from 'axios'
import { env } from '../../../environments/env'
import { tokenRepository } from '../../shared/infrastructure/token-repository'

/** Nombre del archivo según `Content-Disposition` (`filename="..."` o `filename*=UTF-8''...`). */
export function filenameFromDisposition(header: string | undefined | null, fallback: string): string {
  if (!header) return fallback
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star) {
    try { return decodeURIComponent(star[1].trim()) } catch { /* cae al siguiente formato */ }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1].trim() : fallback
}

/**
 * Descarga un `.../export.csv` del backend. El endpoint exige el header `Authorization`, así que un
 * `<a href>` directo no sirve: se pide como blob y se dispara la descarga con un enlace temporal.
 * Usa su propia llamada de axios porque `httpClient` solo devuelve JSON.
 */
export async function downloadCsv(
  path: string,
  params: Record<string, string | number | undefined>,
  fallbackName: string,
): Promise<void> {
  const token = tokenRepository.getAccessToken()
  const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  const res = await axios.get<Blob>(`${env.apiBaseUrl}${path}`, {
    params:       query,
    responseType: 'blob',
    headers:      token ? { Authorization: `Bearer ${token}` } : {},
  })
  const url = URL.createObjectURL(res.data)
  const a = Object.assign(document.createElement('a'), {
    href:     url,
    download: filenameFromDisposition(res.headers['content-disposition'] as string | undefined, fallbackName),
  })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
