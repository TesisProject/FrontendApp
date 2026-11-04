import { httpClient } from '../../shared/infrastructure/http-client'
import type { NearbyZoneResponse, ZoneResponse } from './zone-response'

export class ZoneApi {
  private base = '/parking/zones'

  getAll(): Promise<ZoneResponse[]> {
    return httpClient.get<ZoneResponse[]>(this.base)
  }

  getById(id: number): Promise<ZoneResponse> {
    return httpClient.get<ZoneResponse>(`${this.base}/${id}`)
  }

  /** Zonas activas a menos de `radiusKm` del punto, de la más cercana a la más lejana (HU-07/10). */
  getNearby(lat: number, lng: number, radiusKm: number): Promise<NearbyZoneResponse[]> {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radiusKm: String(radiusKm) })
    return httpClient.get<NearbyZoneResponse[]>(`${this.base}/nearby?${params}`)
  }
}
