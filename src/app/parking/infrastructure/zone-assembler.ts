import type { Zone, ZoneClassification } from '../domain/model/zone.model'
import type { ZoneResponse } from './zone-response'

export function toZone(r: ZoneResponse): Zone {
  return {
    id:                  r.id,
    name:                r.name,
    street:              r.street,
    district:            r.district,
    city:                r.city,
    latitude:            r.latitude,
    longitude:           r.longitude,
    totalSpaces:         r.totalSpaces,
    occupiedCount:       r.occupiedCount,
    freeCount:           r.freeCount,
    occupancyPercentage: r.occupancyPercentage,
    classification:      r.classification as ZoneClassification,
    active:              r.active,
  }
}
