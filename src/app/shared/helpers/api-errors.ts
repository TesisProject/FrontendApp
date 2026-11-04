import { errorCode } from '../infrastructure/http-client'

/**
 * Errores por campo de un `VALIDATION_ERROR`. El backend los manda en `message` como
 * `"campo: motivo, campo: motivo"`; se devuelve `{ campo: motivo }` para marcar cada campo sin
 * perder los demás (HU-04).
 */
export function validationFieldErrors(error: unknown, fields: readonly string[]): Record<string, string> {
  if (errorCode(error) !== 'VALIDATION_ERROR') return {}
  const message = (error as { message?: unknown } | null)?.message
  if (typeof message !== 'string') return {}
  const result: Record<string, string> = {}
  // Se corta por la posición de cada "campo:" conocido: el motivo puede llevar comas.
  const pattern = new RegExp(`(?:^|,\\s*)(${fields.join('|')}):\\s*`, 'g')
  const matches = [...message.matchAll(pattern)]
  matches.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length
    const end   = i + 1 < matches.length ? matches[i + 1].index : message.length
    result[m[1]] = message.slice(start, end).trim()
  })
  return result
}
