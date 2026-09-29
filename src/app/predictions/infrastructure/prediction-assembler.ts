import type { OccupancyForecast, ZoneModelMetrics } from '../domain/model/prediction.model'
import type { OccupancyForecastResponse, ZoneModelMetricsResponse } from './prediction-response'

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

export function toModelMetrics(res: ZoneModelMetricsResponse): ZoneModelMetrics {
  return {
    zoneId:         res.zoneId,
    reliabilityPct: res.reliabilityPct,
    trainingPct:    res.trainingPct,
    evaluatedHours: res.evaluatedHours,
    hits:           res.hits,
    historyDays:    res.historyDays,
    targetDays:     res.targetDays,
    modelVersion:   res.modelVersion,
  }
}
