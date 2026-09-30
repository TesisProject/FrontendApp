export type DayOfWeek =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
  | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface OccupancyForecast {
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

/** Métricas del modelo para una zona. Un porcentaje `null` significa que aún no hay datos suficientes. */
export interface ZoneModelMetrics {
  zoneId: number
  reliabilityPct: number | null
  trainingPct: number | null
  evaluatedHours: number
  hits: number
  historyDays: number | null
  targetDays: number
  modelVersion: string | null
}
