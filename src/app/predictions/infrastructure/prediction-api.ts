import { httpClient } from '../../shared/infrastructure/http-client'
import type { PredictionResponse, PredictionModelResponse } from './prediction-response'

const BASE = '/prediction'

export class PredictionApi {
  async getPredictions(zoneId: string): Promise<PredictionResponse[]> {
    return httpClient.get<PredictionResponse[]>(`${BASE}/zones/${zoneId}`)
  }

  async getActiveModel(): Promise<PredictionModelResponse> {
    return httpClient.get<PredictionModelResponse>(`${BASE}/models/active`)
  }
}

export const predictionApi = new PredictionApi()
