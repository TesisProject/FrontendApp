import type { Prediction, PredictionModel } from '../domain/model/prediction.model'
import type { PredictionResponse, PredictionModelResponse } from './prediction-response'

export function toPrediction(res: PredictionResponse): Prediction {
  return {
    id:                  res.id,
    zoneId:              res.zoneId,
    zoneName:            res.zoneName,
    modelId:             res.modelId,
    predictedOccupancy:  res.predictedOccupancy,
    targetDatetime:      res.targetDatetime,
    confidenceScore:     res.confidenceScore,
    createdAt:           res.createdAt,
  }
}

export function toPredictionModel(res: PredictionModelResponse): PredictionModel {
  return {
    id:          res.id,
    version:     res.version,
    algorithm:   'RANDOM_FOREST',
    accuracy:    res.accuracy,
    deployedAt:  res.deployedAt,
  }
}
