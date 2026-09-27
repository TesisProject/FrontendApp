import { httpClient } from '../../shared/infrastructure/http-client'
import type { OccupancyForecastResponse } from './prediction-response'

const BASE = '/prediction/forecasts'

export class PredictionApi {
  getBySpot(spotId: number): Promise<OccupancyForecastResponse[]> {
    return httpClient.get<OccupancyForecastResponse[]>(`${BASE}/spots/${spotId}`)
  }
}

export const predictionApi = new PredictionApi()
