/** Pantalla a la que se entra después de iniciar sesión cuando no hay una solicitada. */
export const DEFAULT_USER_HOME = '/dashboard'

/**
 * Destino después de iniciar sesión (HU-05, CP014): la pantalla protegida que el usuario pidió antes
 * de que lo mandaran a login (`?returnUrl=`), si es una ruta del área del conductor. Cualquier otra
 * cosa (vacía, otro origen como `//evil.com` o `https://…`, una ruta de admin) vuelve a `/dashboard`,
 * para que el parámetro no sirva de redirección abierta.
 */
export function resolveReturnUrl(raw: unknown, fallback = DEFAULT_USER_HOME): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  const path = value.split(/[?#]/)[0]
  if (path !== DEFAULT_USER_HOME && !path.startsWith(`${DEFAULT_USER_HOME}/`)) return fallback
  return value
}
