import { httpClient } from '../../shared/infrastructure/http-client'
import type { ZoneAvailabilityResponse } from './availability-response'

/** Disponibilidad viva por zona — la sirve vision bajo `/occupancy/**` (única ruta del gateway). */
export class AvailabilityApi {
  private base = '/occupancy/zones'

  getAll(): Promise<ZoneAvailabilityResponse[]> {
    return httpClient.get<ZoneAvailabilityResponse[]>(`${this.base}/availability`)
  }

  getByZone(zoneId: string | number): Promise<ZoneAvailabilityResponse> {
    return httpClient.get<ZoneAvailabilityResponse>(`${this.base}/${zoneId}/availability`)
  }
}
