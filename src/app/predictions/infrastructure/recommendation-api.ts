import { httpClient } from '../../shared/infrastructure/http-client'
import type { ZoneRecommendationsResponse } from './recommendation-response'

export interface RecommendationQuery {
  lat:       number
  lng:       number
  radiusKm?: number
  limit?:    number
}

export class RecommendationApi {
  /** Zonas cercanas con más probabilidad de espacio libre, de mayor a menor (HU-13). */
  getRecommendations(query: RecommendationQuery): Promise<ZoneRecommendationsResponse> {
    const params = new URLSearchParams({ lat: String(query.lat), lng: String(query.lng) })
    if (query.radiusKm != null) params.set('radiusKm', String(query.radiusKm))
    if (query.limit != null) params.set('limit', String(query.limit))
    return httpClient.get<ZoneRecommendationsResponse>(`/prediction/recommendations?${params}`)
  }
}

export const recommendationApi = new RecommendationApi()
