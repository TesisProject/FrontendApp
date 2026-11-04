import type { OpeningHoursEntry } from './opening-hours.model'
import type { ZonePhoto } from './zone-photo.model'

export type ZoneClassification = 'LIBRE' | 'MODERADO' | 'OCUPADO' | 'SIN_DATOS'

export interface Zone {
  id:                  number
  name:                string
  street:              string
  district:            string
  city:                string
  latitude:            number
  longitude:           number
  totalSpaces:         number
  totalCapacity:       number
  occupiedCount:       number
  freeCount:           number
  occupancyPercentage: number
  classification:      ZoneClassification
  /** Detección más reciente de la zona (ISO-8601); `null` si nunca llegó una. */
  lastUpdatedAt:       string | null
  /** La última detección tiene más de 90 s: el estado es el último conocido (HU-08). */
  stale:               boolean
  /** Tramos de atención; `[]` = la zona no informó su horario ("Sin información"). */
  openingHours:        OpeningHoursEntry[]
  /** Lugar de Google Places; sus fotos se resuelven en el navegador. */
  googlePlaceId:       string | null
  /** Fotos subidas por el administrador (no las capturas de cámara). */
  photos:              ZonePhoto[]
  active:              boolean
}
