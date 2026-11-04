/**
 * Datos del flujo de recuperación (correo y código verificado) entre las pantallas
 * forgot-password → otp → reset-password. Viven en sessionStorage y no en la URL (HU-03): un código
 * en la query queda en el historial del navegador, en los logs del servidor y en el Referer.
 * sessionStorage muere al cerrar la pestaña y no se comparte con otras.
 */
const KEY = 'pv_password_recovery'

export interface RecoverySession {
  email: string
  code?: string
}

interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createRecoverySession(storage: KeyValueStorage) {
  function read(): RecoverySession | null {
    try {
      const raw = storage.getItem(KEY)
      const parsed = raw ? JSON.parse(raw) as RecoverySession : null
      return parsed && typeof parsed.email === 'string' ? parsed : null
    } catch {
      return null
    }
  }

  return {
    get: read,
    /** Empieza el flujo con el correo; descarta cualquier código anterior. */
    start(email: string): void {
      storage.setItem(KEY, JSON.stringify({ email }))
    },
    /** Guarda el código ya verificado para el paso de nueva contraseña. */
    saveCode(code: string): void {
      const current = read()
      if (current) storage.setItem(KEY, JSON.stringify({ ...current, code }))
    },
    /** Olvida el código (vencido o usado) pero conserva el correo para pedir otro. */
    clearCode(): void {
      const current = read()
      if (current) storage.setItem(KEY, JSON.stringify({ email: current.email }))
    },
    clear(): void {
      storage.removeItem(KEY)
    },
  }
}

const memory = new Map<string, string>()
const fallbackStorage: KeyValueStorage = {
  getItem:    k => memory.get(k) ?? null,
  setItem:    (k, v) => { memory.set(k, v) },
  removeItem: k => { memory.delete(k) },
}

export const recoverySession = createRecoverySession(
  typeof sessionStorage !== 'undefined' ? sessionStorage : fallbackStorage,
)
