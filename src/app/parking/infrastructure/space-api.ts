import { httpClient } from '../../shared/infrastructure/http-client'
import type { SpaceResponse } from './space-response'

export class SpaceApi {
  private base = '/parking/spaces'

  getByZone(zoneId: string | number): Promise<SpaceResponse[]> {
    return httpClient.get<SpaceResponse[]>(`${this.base}?zoneId=${zoneId}`)
  }
}
