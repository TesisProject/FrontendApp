import { httpClient } from '../../shared/infrastructure/http-client'
import type { ZoneResponse } from './zone-response'

export class ZoneApi {
  private base = '/parking/zones'

  getAll(): Promise<ZoneResponse[]> {
    return httpClient.get<ZoneResponse[]>(this.base)
  }

  getById(id: number): Promise<ZoneResponse> {
    return httpClient.get<ZoneResponse>(`${this.base}/${id}`)
  }
}
