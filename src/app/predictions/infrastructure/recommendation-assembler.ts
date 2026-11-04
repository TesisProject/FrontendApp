import { toClassification } from '../../parking/domain/zone-classification'
import type { ZoneRecommendation, ZoneRecommendations } from '../domain/model/recommendation.model'
import type { ZoneRecommendationResponse, ZoneRecommendationsResponse } from './recommendation-response'

export function toRecommendation(r: ZoneRecommendationResponse): ZoneRecommendation {
  return {
    zoneId:                    r.zoneId,
    zoneName:                  r.zoneName,
    latitude:                  r.latitude,
    longitude:                 r.longitude,
    distanceMeters:            r.distanceMeters,
    estimatedAvailabilityPct:  r.estimatedAvailabilityPct,
    currentAvailabilityPct:    r.currentAvailabilityPct ?? null,
    nextWindowAvailabilityPct: r.nextWindowAvailabilityPct ?? null,
    available:                 r.available ?? null,
    total:                     r.total ?? null,
    classification:            toClassification(r.classification),
    stale:                     r.stale ?? false,
  }
}

export function toRecommendations(r: ZoneRecommendationsResponse): ZoneRecommendations {
  return { generatedAt: r.generatedAt, radiusKm: r.radiusKm, items: (r.items ?? []).map(toRecommendation) }
}
