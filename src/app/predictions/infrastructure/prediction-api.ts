import { httpClient } from '../../shared/infrastructure/http-client'
import type {
  OccupancyForecastResponse,
  ZoneForecastComparisonResponse,
} from './prediction-response'

const BASE = '/prediction/forecasts'
const ZONES_BASE = '/prediction/zones'

export class PredictionApi {
  getBySpot(spotId: number): Promise<OccupancyForecastResponse[]> {
    return httpClient.get<OccupancyForecastResponse[]>(`${BASE}/spots/${spotId}`)
  }

  getCurrentForSpot(spotId: number): Promise<OccupancyForecastResponse> {
    return httpClient.get<OccupancyForecastResponse>(`${BASE}/spots/${spotId}/current`)
  }

  /** Comparación predicción IA vs detección real de cámaras para la ventana vigente de la zona. */
  getZoneComparison(zoneId: number): Promise<ZoneForecastComparisonResponse> {
    return httpClient.get<ZoneForecastComparisonResponse>(`${ZONES_BASE}/${zoneId}/forecast/comparison`)
  }
}

export const predictionApi = new PredictionApi()
