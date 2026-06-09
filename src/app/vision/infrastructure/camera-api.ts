import { httpClient } from '../../shared/infrastructure/http-client'
import type { CameraResponse } from './camera-response'

export class CameraApi {
  private base = '/vision/cameras'

  getByZone(zoneId: string | number): Promise<CameraResponse[]> {
    return httpClient.get<CameraResponse[]>(`${this.base}?zoneId=${zoneId}`)
  }
}
