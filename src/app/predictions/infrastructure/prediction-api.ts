import { httpClient } from '../../shared/infrastructure/http-client'
import type { ZoneForecastResponse, ZoneModelMetricsResponse } from './prediction-response'

export class PredictionApi {
  /** Pronóstico semanal de la zona (7 días × ventanas del día), ordenado de lunes a domingo. */
  getZoneForecasts(zoneId: number): Promise<ZoneForecastResponse[]> {
    return httpClient.get<ZoneForecastResponse[]>(`/prediction/zones/${zoneId}/forecasts`)
  }

  /** Confiabilidad y progreso de entrenamiento del modelo, calculados por el backend con datos reales. */
  getZoneModelMetrics(zoneId: number): Promise<ZoneModelMetricsResponse> {
    return httpClient.get<ZoneModelMetricsResponse>(`/prediction/zones/${zoneId}/model-metrics`)
  }
}

export const predictionApi = new PredictionApi()
