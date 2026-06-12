import type { ParkingSpace } from '../domain/model/space.model'
import type { SpaceResponse } from './space-response'

export function toSpace(r: SpaceResponse): ParkingSpace {
  return {
    id:          r.id,
    zoneId:      r.zoneId,
    spaceNumber: r.spaceNumber,
    occupied:    r.currentStatus === 'OCCUPIED',
    lastUpdated: r.updatedAt,
  }
}
