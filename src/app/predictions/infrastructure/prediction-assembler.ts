import type { OccupancyForecast } from '../domain/model/prediction.model'
import type { OccupancyForecastResponse } from './prediction-response'

export function toForecast(res: OccupancyForecastResponse): OccupancyForecast {
  return {
    id:                      res.id,
    parkingSpotId:           res.parkingSpotId,
    dayOfWeek:               res.dayOfWeek,
    startMinuteOfDay:        res.startMinuteOfDay,
    windowSizeMinutes:       res.windowSizeMinutes,
    availabilityProbability: res.availabilityProbability,
    modelVersion:            res.modelVersion,
    createdAt:               res.createdAt,
    updatedAt:               res.updatedAt,
  }
}
