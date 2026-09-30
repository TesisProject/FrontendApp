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

export interface ZoneModelMetricsResponse {
  zoneId: number
  reliabilityPct: number | null
  trainingPct: number | null
  evaluatedHours: number
  hits: number
  historyDays: number | null
  targetDays: number
  lookbackDays: number
  tolerancePct: number
  modelVersion: string | null
  computedAt: string
}
