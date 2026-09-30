import type { Zone, ZoneClassification } from '../domain/model/zone.model'
import type { ZoneResponse } from './zone-response'
import type { ZoneAvailabilityResponse } from './availability-response'

/**
 * Fusiona la zona estática (parking) con la disponibilidad viva (vision) en el mismo `Zone` que ya
 * consumen las vistas. Sin disponibilidad (vision caído o zona sin espacios monitoreados) la zona se
 * muestra como libre.
 */
export function toZone(r: ZoneResponse, availability?: ZoneAvailabilityResponse): Zone {
  return {
    id:                  r.id,
    name:                r.name,
    street:              r.street,
    district:            r.district,
    city:                r.city,
    latitude:            r.latitude,
    longitude:           r.longitude,
    totalSpaces:         r.totalSpaces,
    occupiedCount:       availability?.occupied ?? 0,
    freeCount:           availability?.available ?? r.totalSpaces,
    occupancyPercentage: availability?.occupancyPercentage ?? 0,
    classification:      (availability?.classification ?? 'LIBRE') as ZoneClassification,
    active:              r.active,
  }
}
