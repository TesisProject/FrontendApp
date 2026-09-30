import { httpClient } from '../../shared/infrastructure/http-client'
import type { OccupancyForecastResponse, ZoneModelMetricsResponse } from './prediction-response'

const BASE = '/prediction/forecasts'

export class PredictionApi {
  getBySpot(spotId: number): Promise<OccupancyForecastResponse[]> {
    return httpClient.get<OccupancyForecastResponse[]>(`${BASE}/spots/${spotId}`)
  }

  /** Confiabilidad y progreso de entrenamiento del modelo, calculados por el backend con datos reales. */
  getZoneModelMetrics(zoneId: number): Promise<ZoneModelMetricsResponse> {
    return httpClient.get<ZoneModelMetricsResponse>(`/prediction/zones/${zoneId}/model-metrics`)
  }
}

export const predictionApi = new PredictionApi()
