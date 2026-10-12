import { httpClient } from '../../shared/infrastructure/http-client'
import type {
  ZoneAvailabilityResponse, ZoneOccupancyHistoryBucketResponse, ZoneOccupancyHistoryPointResponse,
  ZoneViewResponse,
} from './availability-response'

/** Tamaños de intervalo que acepta el backend; cualquier otro responde 400. */
export type HistoryBucketSize = '15m' | '30m' | '3h'

export interface HistoryBucketQuery {
  bucket: HistoryBucketSize
  /** Instantes ISO-8601 (p. ej. `Date#toISOString()`). */
  from:   string
  to:     string
}

/** Disponibilidad viva por zona — la sirve vision bajo `/occupancy/**` (única ruta del gateway). */
export class AvailabilityApi {
  private base = '/occupancy/zones'

  getAll(): Promise<ZoneAvailabilityResponse[]> {
    return httpClient.get<ZoneAvailabilityResponse[]>(`${this.base}/availability`)
  }

  getByZone(zoneId: string | number): Promise<ZoneAvailabilityResponse> {
    return httpClient.get<ZoneAvailabilityResponse>(`${this.base}/${zoneId}/availability`)
  }

  /** Historial agregado por intervalos, para el gráfico (un punto por intervalo con datos). */
  getZoneHistoryBuckets(zoneId: string | number, query: HistoryBucketQuery): Promise<ZoneOccupancyHistoryBucketResponse[]> {
    const params = new URLSearchParams({ bucket: query.bucket, from: query.from, to: query.to })
    return httpClient.get<ZoneOccupancyHistoryBucketResponse[]>(`${this.base}/${zoneId}/occupancy/history?${params}`)
  }

  /** Historial de ocupación de la zona: un punto por cada frame registrado (últimos 30 días). */
  getZoneHistory(zoneId: string | number): Promise<ZoneOccupancyHistoryPointResponse[]> {
    return httpClient.get<ZoneOccupancyHistoryPointResponse[]>(`${this.base}/${zoneId}/occupancy/history`)
  }

  /** Vistas de la zona: última foto de cada cámara + los espacios (con ROI) que cubre. */
  getZoneViews(zoneId: string | number): Promise<ZoneViewResponse[]> {
    return httpClient.get<ZoneViewResponse[]>(`${this.base}/${zoneId}/views`)
  }
}
