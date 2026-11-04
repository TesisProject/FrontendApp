import { CLASSIFICATION_COLOR, CLASSIFICATION_LABEL } from '../../parking/domain/zone-classification'
import type { ZoneClassification } from '../../parking/domain/model/zone.model'

/**
 * Clasificación de una zona sin datos (contrato de la iteración 2: `LIBRE | MODERADO | OCUPADO |
 * SIN_DATOS`). Se mapea aquí con respaldo local para que las vistas de analítica muestren "Sin datos"
 * en gris aunque la paleta compartida (`zone-classification.ts`) todavía no tenga la entrada.
 */
export const NO_DATA = 'SIN_DATOS'
export const NO_DATA_LABEL = 'Sin datos'
export const NO_DATA_COLOR = '#a0aec0'

/** `false` si la zona no tiene lectura (clasificación `SIN_DATOS`, vacía o desconocida). */
export function hasLiveData(classification: string | null | undefined): boolean {
  return !!classification && classification !== NO_DATA && classification in CLASSIFICATION_COLOR
}

export function levelColor(classification: string | null | undefined): string {
  return hasLiveData(classification) ? CLASSIFICATION_COLOR[classification as ZoneClassification] : NO_DATA_COLOR
}

export function levelLabel(classification: string | null | undefined): string {
  return hasLiveData(classification) ? CLASSIFICATION_LABEL[classification as ZoneClassification] : NO_DATA_LABEL
}

export interface OccupancyShare {
  occupied:       number
  capacity:       number
  classification: string
}

/**
 * Ocupación global (%) ponderada por capacidad: ocupados / capacidad sumando solo las zonas con datos.
 * Un promedio simple de porcentajes haría pesar igual una zona de 5 plazas que una de 200.
 * `null` si ninguna zona tiene datos.
 */
export function weightedOccupancy(zones: OccupancyShare[]): number | null {
  const live = zones.filter(z => hasLiveData(z.classification) && z.capacity > 0)
  const capacity = live.reduce((s, z) => s + z.capacity, 0)
  if (capacity === 0) return null
  const occupied = live.reduce((s, z) => s + Math.min(z.occupied, z.capacity), 0)
  return (occupied / capacity) * 100
}
