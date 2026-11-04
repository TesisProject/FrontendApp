/** Una zona de `GET /prediction/recommendations` (HU-13). Porcentajes enteros 0–100. */
export interface ZoneRecommendationResponse {
  zoneId:                    number
  zoneName:                  string
  latitude:                  number
  longitude:                 number
  distanceMeters:            number
  estimatedAvailabilityPct:  number
  currentAvailabilityPct:    number | null
  nextWindowAvailabilityPct: number | null
  available:                 number | null
  total:                     number | null
  classification:            string
  stale:                     boolean
  nextWindowStart:           string | null
}

export interface ZoneRecommendationsResponse {
  generatedAt: string
  radiusKm:    number
  items:       ZoneRecommendationResponse[]
}
