import type { OpeningHoursEntry } from '../../../parking/domain/model/opening-hours.model'
import type { ZonePhoto } from '../../../parking/domain/model/zone-photo.model'

export interface AdminZone {
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
  classification:      string
  /** `[]` = sin información. */
  openingHours:        OpeningHoursEntry[]
  googlePlaceId:       string | null
  /** Fotos subidas por el administrador. */
  photos:              ZonePhoto[]
  active:              boolean
}

export interface AdminZoneForm {
  name:          string
  street:        string
  district:      string
  city:          string
  latitude:      number
  longitude:     number
  totalSpaces:   number
  totalCapacity: number
  /** Tramos de atención; `[]` = sin información. */
  openingHours:  OpeningHoursEntry[]
  /** Lugar de Google Places elegido en el autocompletado; `null` si se ubicó a mano. */
  googlePlaceId: string | null
}

/** Tipos y tamaño que acepta `POST /parking/zones/{id}/photos`. */
export const ZONE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ZONE_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const ZONE_PHOTOS_MAX = 10

/** Error de un archivo antes de subirlo, o `null` si es válido. */
export function zonePhotoFileError(file: { type: string; size: number; name: string }): string | null {
  if (!(ZONE_PHOTO_TYPES as readonly string[]).includes(file.type)) return `«${file.name}» no es JPG, PNG ni WebP`
  if (file.size > ZONE_PHOTO_MAX_BYTES) return `«${file.name}» pesa más de 5 MB`
  return null
}
