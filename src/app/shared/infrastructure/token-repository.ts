import { jwtDecode } from 'jwt-decode'

const ACCESS_TOKEN_KEY = 'pv_access_token'
const USER_KEY         = 'pv_user'

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

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  },
}
