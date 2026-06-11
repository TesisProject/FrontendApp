export interface PredictionModelResponse {
  id: string
  version: string
  algorithm: string
  accuracy: number
  deployedAt: string
}

export interface PredictionResponse {
  id: string
  zoneId: string
  zoneName: string
  modelId: string
  predictedOccupancy: number
  targetDatetime: string
  confidenceScore: number
  createdAt: string
}

export interface PredictionRequest {
  zoneId: string
  features: {
    hour: number
    dayOfWeek: number
  }
}
