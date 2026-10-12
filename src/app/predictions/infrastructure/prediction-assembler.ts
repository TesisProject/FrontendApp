import type { ZoneForecast, ZoneForecastSnapshot, ZoneModelMetrics } from '../domain/model/prediction.model'
import type { ZoneForecastResponse, ZoneForecastSnapshotResponse, ZoneModelMetricsResponse } from './prediction-response'

export function toForecast(res: ZoneForecastResponse): ZoneForecast {
  return {
    id:                      res.id,
    zoneId:                  res.zoneId,
    dayOfWeek:               res.dayOfWeek,
    startMinuteOfDay:        res.startMinuteOfDay,
    windowSizeMinutes:       res.windowSizeMinutes,
    availabilityProbability: res.availabilityProbability,
    totalSpots:              res.totalSpots,
    predictedAvailableSpots: res.predictedAvailableSpots,
    predictedOccupiedSpots:  res.predictedOccupiedSpots,
    modelVersion:            res.modelVersion,
    createdAt:               res.createdAt,
    updatedAt:               res.updatedAt,
  }
}

export function toForecastSnapshot(res: ZoneForecastSnapshotResponse): ZoneForecastSnapshot {
  return {
    windowStart:             res.windowStart,
    windowSizeMinutes:       res.windowSizeMinutes,
    availabilityProbability: res.availabilityProbability,
    totalSpots:              res.totalSpots,
    modelVersion:            res.modelVersion,
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
