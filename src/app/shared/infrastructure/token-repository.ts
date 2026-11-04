import { jwtDecode } from 'jwt-decode'

const ACCESS_TOKEN_KEY = 'pv_access_token'
const USER_KEY         = 'pv_user'

/** `true` si el JWT venció (o no trae `exp` legible). Exportado para los tests. */
export function isExpired(token: string, nowMs = Date.now(), skewSeconds = 0): boolean {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token)
    if (typeof exp !== 'number') return true
    return exp - skewSeconds <= Math.floor(nowMs / 1000)
  } catch {
    return true
  }
}

export const tokenRepository = {
  save(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  saveUser(user: object): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  getUser<T>(): T | null {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) as T : null
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  parseToken<T = Record<string, unknown>>(): T | null {
    const token = this.getAccessToken()
    return token ? jwtDecode<T>(token) : null
  },

  /**
   * Hay token y su `exp` no pasó. Un token que no se puede decodificar cuenta como vencido. Con
   * `skewSeconds` se da por vencido un poco antes, para no navegar a una pantalla cuyas peticiones
   * van a dar 401.
   */
  isAuthenticated(nowMs = Date.now(), skewSeconds = 5): boolean {
    const token = this.getAccessToken()
    if (!token) return false
    return !isExpired(token, nowMs, skewSeconds)
  },
}
