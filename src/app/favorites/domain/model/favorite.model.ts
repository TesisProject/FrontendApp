import type { ZoneClassification } from '../../../parking/domain/model/zone.model'

/**
 * Zona favorita con su estado actual (HU-28), tal como la devuelve el backend. Si la zona se borró
 * del catálogo, `zoneName` y el estado vienen en null y la vista muestra "Zona no disponible".
 */
export interface Favorite {
  userId:         number
  zoneId:         number
  savedAt:        string
  zoneName:       string | null
  classification: ZoneClassification | null
  available:      number | null
  total:          number | null
}
