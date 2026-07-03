import { httpClient } from '../../shared/infrastructure/http-client'
import type { CameraResponse } from './camera-response'

export class CameraApi {
  // Vision se publica bajo /occupancy/** en el gateway (no existe ruta /vision/**).
  private base = '/occupancy/cameras'

  getByZone(zoneId: string | number): Promise<CameraResponse[]> {
    return httpClient.get<CameraResponse[]>(`${this.base}?zoneId=${zoneId}`)
  }
}
