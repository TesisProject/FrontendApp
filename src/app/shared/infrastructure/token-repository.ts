import { jwtDecode } from 'jwt-decode'

const ACCESS_TOKEN_KEY = 'pv_access_token'

export const tokenRepository = {
  save(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  },

  parseToken<T = Record<string, unknown>>(): T | null {
    const token = this.getAccessToken()
    return token ? jwtDecode<T>(token) : null
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  },
}
