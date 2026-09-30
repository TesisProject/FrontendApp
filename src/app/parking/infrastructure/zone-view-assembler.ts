import type { ZoneView } from '../domain/model/zone-view.model'
import type { ZoneViewResponse } from './availability-response'

export function toZoneView(r: ZoneViewResponse, now = Date.now()): ZoneView {
  return {
    id:         r.viewId,
    imageUrl:   r.imageUrl,
    capturedAt: r.capturedAt,
    rotation:   r.rotation ?? 0,
    expiresAt:  r.expiresInSeconds ? now + r.expiresInSeconds * 1000 : null,
    spaces:     (r.spaces ?? []).map(s => ({ spaceId: s.parkingSpaceId, roi: s.roi ?? [] })),
  }
}
