import type { Camera } from '../domain/model/camera.model'
import type { CameraResponse } from './camera-response'

export function toCamera(r: CameraResponse): Camera {
  return {
    id:       r.id,
    code:     r.code,
    zoneId:   r.zoneId,
    name:     r.name ?? r.code,
    location: r.location ?? '',
    active:   r.active,
  }
}
