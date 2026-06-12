import type { AdminZone } from '../domain/model/admin-zone.model'
import type { AdminCamera } from '../domain/model/admin-camera.model'
import type { AdminUser, AdminRole } from '../domain/model/admin-user.model'
import type { AdminZoneResponse, AdminCameraResponse, AdminUserResponse } from './admin-response'

export function toAdminZone(r: AdminZoneResponse): AdminZone {
  return {
    id:                  r.id,
    name:                r.name,
    street:              r.street,
    district:            r.district,
    city:                r.city,
    latitude:            r.latitude,
    longitude:           r.longitude,
    totalSpaces:         r.totalSpaces,
    occupiedCount:       r.occupiedCount,
    freeCount:           r.freeCount,
    occupancyPercentage: r.occupancyPercentage,
    classification:      r.classification,
    active:              r.active,
  }
}

export function toAdminCamera(r: AdminCameraResponse): AdminCamera {
  return {
    id:              r.id,
    zoneId:          r.zoneId,
    name:            r.name,
    streamUrl:       r.streamUrl,
    status:          r.status as AdminCamera['status'],
    resolution:      r.resolution,
    fps:             r.fps,
    detectorVersion: r.detectorVersion,
  }
}

export function toAdminUser(r: AdminUserResponse): AdminUser {
  return {
    id:     r.id,
    email:  r.email,
    role:   r.role as AdminRole,
    active: r.isActive ?? (r as any).active ?? false,
  }
}
