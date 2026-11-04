/**
 * Frescura de la disponibilidad (HU-08). El backend marca `stale` cuando la última detección tiene más
 * de 90 s (3 capturas de 30 s sin novedades): se sigue mostrando el último estado conocido, con la
 * hora en que se obtuvo.
 */
export interface AvailabilityFreshness {
  lastUpdatedAt: string | null
  stale:         boolean
}

/** "14:05" en hora local; `null` si no hay fecha o no es válida. */
export function formatUpdatedClock(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Texto del aviso de datos viejos: "Datos no actualizados · 14:05", o sin hora si nunca hubo una
 * lectura. `null` cuando los datos están al día y no hay que avisar.
 */
export function staleNotice(f: AvailabilityFreshness): string | null {
  if (!f.stale) return null
  const clock = formatUpdatedClock(f.lastUpdatedAt)
  return clock ? `Datos no actualizados · ${clock}` : 'Datos no actualizados'
}
