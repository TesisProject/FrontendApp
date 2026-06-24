import type { DayOfWeek } from '../domain/model/prediction.model'

export interface OccupancyForecastResponse {
  id: number
  parkingSpotId: number
  dayOfWeek: DayOfWeek
  startMinuteOfDay: number
  windowSizeMinutes: number
  availabilityProbability: number
  modelVersion: string
  createdAt: string
  updatedAt: string
}

export interface PredictedSideResponse {
  availabilityProbability: number
  totalSpots: number
  availableSpots: number
  occupiedSpots: number
  modelVersion: string
}

export interface ActualSideResponse {
  totalSpots: number
  availableSpots: number
  occupiedSpots: number
  occurredAt: string
}

export interface ComparisonDeltaResponse {
  availableDiff: number
  occupiedDiff: number
}

export interface ZoneForecastComparisonResponse {
  zoneId: number
  dayOfWeek: DayOfWeek
  startMinuteOfDay: number
  windowSizeMinutes: number
  predicted: PredictedSideResponse
  actual: ActualSideResponse | null
  delta: ComparisonDeltaResponse | null
}
