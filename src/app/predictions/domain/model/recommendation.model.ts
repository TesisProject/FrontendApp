import type { ZoneClassification } from '../../../parking/domain/model/zone.model'

/**
 * Una zona recomendada (HU-13): la sugiere el backend combinando la disponibilidad actual con la
 * probabilidad de espacio libre de la ventana siguiente, y la distancia al usuario.
 */
export interface ZoneRecommendation {
  zoneId:                    number
  zoneName:                  string
  latitude:                  number
  longitude:                 number
  distanceMeters:            number
  /** % estimado de disponibilidad (0–100): lo que ordena la lista. */
  estimatedAvailabilityPct:  number
  /** % libre medido ahora; `null` si la zona está sin datos. */
  currentAvailabilityPct:    number | null
  /** Probabilidad de espacio libre en la ventana siguiente; `null` sin pronóstico. */
  nextWindowAvailabilityPct: number | null
  available:                 number | null
  total:                     number | null
  classification:            ZoneClassification
  stale:                     boolean
}

export interface ZoneRecommendations {
  generatedAt: string
  radiusKm:    number
  items:       ZoneRecommendation[]
}
