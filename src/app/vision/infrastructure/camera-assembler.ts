import type { Camera, CameraStatus } from '../domain/model/camera.model'
import type { CameraResponse } from './camera-response'

export function toCamera(r: CameraResponse): Camera {
  return {
    id:        r.id,
    zoneId:    r.zoneId,
    ipAddress: r.ipAddress,
    status:    r.status as CameraStatus,
  }
}
