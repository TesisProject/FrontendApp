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
