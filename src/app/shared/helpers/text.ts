/** Texto que se muestra en lugar de un dato que la zona (u otro recurso) no informó. */
export const UNKNOWN_TEXT = 'Sin información'

/** El valor como texto, o "Sin información" si es null, undefined o una cadena vacía. */
export function orUnknown(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return UNKNOWN_TEXT
  const text = String(value).trim()
  return text ? text : UNKNOWN_TEXT
}
