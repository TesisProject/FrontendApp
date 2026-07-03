import { httpClient } from '../../shared/infrastructure/http-client'
import type { ZoneAvailabilityResponse, ZoneOccupancyHistoryPointResponse } from './availability-response'

/** Disponibilidad viva por zona — la sirve vision bajo `/occupancy/**` (única ruta del gateway). */
export class AvailabilityApi {
  private base = '/occupancy/zones'

  getAll(): Promise<ZoneAvailabilityResponse[]> {
    return httpClient.get<ZoneAvailabilityResponse[]>(`${this.base}/availability`)
  }

  getByZone(zoneId: string | number): Promise<ZoneAvailabilityResponse> {
    return httpClient.get<ZoneAvailabilityResponse>(`${this.base}/${zoneId}/availability`)
  }

  /** Historial de ocupación de la zona: un punto por cada frame registrado. */
  getZoneHistory(zoneId: string | number): Promise<ZoneOccupancyHistoryPointResponse[]> {
    return httpClient.get<ZoneOccupancyHistoryPointResponse[]>(`${this.base}/${zoneId}/occupancy/history`)
  }
}
