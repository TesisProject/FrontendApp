import { httpClient } from '../../shared/infrastructure/http-client'
import type { CameraAlertInboxItemResponse, CameraAlertResponse } from './camera-alert-response'

const BASE = '/notifications/camera-alerts'

/** Alertas de cámara (ADMIN y OPERATOR). */
export class CameraAlertApi {
  getAll(): Promise<CameraAlertResponse[]> {
    return httpClient.get<CameraAlertResponse[]>(BASE)
  }

  /** La campana: avisos no leídos del usuario del token. */
  getMine(): Promise<CameraAlertInboxItemResponse[]> {
    return httpClient.get<CameraAlertInboxItemResponse[]>(`${BASE}/mine`)
  }

  markMineRead(notificationId: number): Promise<void> {
    return httpClient.patch<void>(`${BASE}/mine/${notificationId}/read`)
  }

  markAllMineRead(): Promise<void> {
    return httpClient.patch<void>(`${BASE}/mine/read`)
  }

  /** Sin cuerpo: la reconoce el usuario del token. */
  acknowledge(alertId: number): Promise<void> {
    return httpClient.patch<void>(`${BASE}/${alertId}/acknowledge`)
  }

  resolve(alertId: number, resolutionNote: string): Promise<void> {
    return httpClient.patch<void>(`${BASE}/${alertId}/resolve`, { resolutionNote })
  }
}
