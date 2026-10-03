import type { DayOfWeek } from '../domain/model/prediction.model'

export interface ZoneForecastResponse {
  id: number
  zoneId: number
  dayOfWeek: DayOfWeek
  startMinuteOfDay: number
  windowSizeMinutes: number
  availabilityProbability: number
  totalSpots: number
  predictedAvailableSpots: number
  predictedOccupiedSpots: number
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
