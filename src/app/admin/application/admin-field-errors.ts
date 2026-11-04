import { errorCode } from '../../shared/infrastructure/http-client'

/** Errores por campo de un formulario: nombre del campo del request → mensaje en español. */
export type FieldErrors = Record<string, string>

/**
 * Traduce un 400 `VALIDATION_ERROR` del backend a errores por campo. El backend junta los campos en
 * `message` como `"name: must not be blank, totalSpaces: must be greater than or equal to 1"`; cada
 * campo se muestra con el texto de `labels` (o uno genérico), nunca con el mensaje en inglés.
 * Devuelve `{}` para cualquier otro error.
 */
export function validationFieldErrors(
  error: unknown,
  labels: Record<string, string> = {},
): FieldErrors {
  if (errorCode(error) !== 'VALIDATION_ERROR') return {}
  const message = (error as { message?: unknown } | null)?.message
  if (typeof message !== 'string') return {}
  const result: FieldErrors = {}
  for (const part of message.split(/,\s*(?=[\w.[\]]+:)/)) {
    const idx = part.indexOf(':')
    if (idx <= 0) continue
    // `openingHours[0].opensAt` → `openingHours`: el formulario marca el campo raíz.
    const field = part.slice(0, idx).trim().split(/[.[]/)[0]!
    if (!result[field]) result[field] = labels[field] ?? 'Valor no válido'
  }
  return result
}
