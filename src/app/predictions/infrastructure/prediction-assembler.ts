import type {
  OccupancyForecast,
  ZoneForecastComparison,
} from '../domain/model/prediction.model'
import type {
  OccupancyForecastResponse,
  ZoneForecastComparisonResponse,
} from './prediction-response'

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

export function toZoneComparison(res: ZoneForecastComparisonResponse): ZoneForecastComparison {
  return {
    zoneId:           res.zoneId,
    dayOfWeek:        res.dayOfWeek,
    startMinuteOfDay: res.startMinuteOfDay,
    windowSizeMinutes: res.windowSizeMinutes,
    predicted: {
      availabilityProbability: res.predicted.availabilityProbability,
      totalSpots:              res.predicted.totalSpots,
      availableSpots:          res.predicted.availableSpots,
      occupiedSpots:           res.predicted.occupiedSpots,
      modelVersion:            res.predicted.modelVersion,
    },
    actual: res.actual
      ? {
          totalSpots:     res.actual.totalSpots,
          availableSpots: res.actual.availableSpots,
          occupiedSpots:  res.actual.occupiedSpots,
          occurredAt:     res.actual.occurredAt,
        }
      : null,
    delta: res.delta
      ? {
          availableDiff: res.delta.availableDiff,
          occupiedDiff:  res.delta.occupiedDiff,
        }
      : null,
  }
}
