export interface PredictionModel {
  id: string
  version: string
  algorithm: 'RANDOM_FOREST'
  accuracy: number
  deployedAt: string
}

export interface Prediction {
  id: string
  zoneId: string
  zoneName: string
  modelId: string
  predictedOccupancy: number  // 0.0 - 1.0
  targetDatetime: string
  confidenceScore: number     // 0.0 - 1.0
  createdAt: string
}
