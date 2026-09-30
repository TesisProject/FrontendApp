import type { ParkingSpace } from '../domain/model/space.model'
import type { SpaceResponse } from './space-response'

/** Combina el espacio del catálogo (parking) con su estado vivo (disponibilidad de vision). */
export function toSpace(r: SpaceResponse, occupied: boolean): ParkingSpace {
  return {
    id:          r.id,
    zoneId:      r.zoneId,
    spaceNumber: r.spaceNumber,
    occupied,
    lastUpdated: r.updatedAt,
  }
}
