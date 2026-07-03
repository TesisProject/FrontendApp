/** Disponibilidad viva de una zona servida por vision (`/occupancy/zones/.../availability`). */
export interface ZoneAvailabilityResponse {
  zoneId:              number
  total:               number
  occupied:            number
  available:           number
  occupancyPercentage: number
  classification:      string
  spaces:              SpaceAvailabilityResponse[]
}

export interface SpaceAvailabilityResponse {
  parkingSpaceId: number
  spaceNumber:    string
  occupied:       boolean
}

/** Un frame del historial de ocupación (`/occupancy/zones/{id}/occupancy/history`). */
export interface ZoneOccupancyHistoryPointResponse {
  occupiedSpots: number
  totalSpots:    number
  freeSpots:     number
  occurredAt:    string
}
