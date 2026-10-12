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

/**
 * Una vista de la zona (`/occupancy/zones/{id}/views`): la última foto de una cámara y los espacios
 * que cubre. No expone el código de la cámara — al usuario no le importa cuál es. `rotation` son los
 * grados (horario) para ver la foto derecha; el `roi` está en coordenadas normalizadas 0–1 de la foto
 * YA girada: se gira la foto y el polígono se dibuja encima tal cual.
 */
export interface ZoneViewResponse {
  viewId:           number
  imageUrl:         string | null
  capturedAt:       string | null
  rotation:         number
  expiresInSeconds: number | null
  spaces:           { parkingSpaceId: number; roi: { x: number; y: number }[] }[]
}

/**
 * Un intervalo del historial agregado por el backend (`…/occupancy/history?bucket=…`). Solo vienen los
 * intervalos con datos, alineados a la hora local de Lima.
 */
export interface ZoneOccupancyHistoryBucketResponse {
  bucketStart: string
  bucketEnd:   string
  avgOccupied: number
  minOccupied: number
  maxOccupied: number
  totalSpots:  number
  frames:      number
}

/** Un frame del historial de ocupación (`/occupancy/zones/{id}/occupancy/history`). */
export interface ZoneOccupancyHistoryPointResponse {
  occupiedSpots: number
  totalSpots:    number
  freeSpots:     number
  occurredAt:    string
}
