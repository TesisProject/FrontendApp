import type { AdminZone } from '../domain/model/admin-zone.model'
import type { AdminCamera } from '../domain/model/admin-camera.model'
import type { AdminUser, AdminRole } from '../domain/model/admin-user.model'
import type { AdminNode } from '../domain/model/admin-node.model'
import type { AdminApiKey } from '../domain/model/admin-api-key.model'
import type {
  AdminZoneResponse, AdminCameraResponse, AdminUserResponse,
  AdminNodeResponse, AdminApiKeyResponse,
} from './admin-response'
import type { ZoneAvailabilityResponse } from '../../parking/infrastructure/availability-response'

/** Fusiona la zona estática (parking) con la disponibilidad viva (vision), si existe. */
export function toAdminZone(r: AdminZoneResponse, availability?: ZoneAvailabilityResponse): AdminZone {
  return {
    id:                  r.id,
    name:                r.name,
    street:              r.street,
    district:            r.district,
    city:                r.city,
    latitude:            r.latitude,
    longitude:           r.longitude,
    totalSpaces:         r.totalSpaces,
    occupiedCount:       availability?.occupied ?? 0,
    freeCount:           availability?.available ?? r.totalSpaces,
    occupancyPercentage: availability?.occupancyPercentage ?? 0,
    classification:      availability?.classification ?? 'LIBRE',
    active:              r.active,
  }
}

export function toAdminCamera(r: AdminCameraResponse): AdminCamera {
  return {
    id:       r.id,
    code:     r.code,
    nodeId:   r.nodeId,
    zoneId:   r.zoneId,
    name:     r.name ?? r.code,
    location: r.location ?? '',
    active:   r.active,
  }
}

export function toAdminNode(r: AdminNodeResponse): AdminNode {
  return {
    id:       r.id,
    code:     r.code,
    name:     r.name ?? r.code,
    location: r.location ?? '',
    active:   r.active,
  }
}

export function toAdminApiKey(r: AdminApiKeyResponse): AdminApiKey {
  return {
    id:         r.id,
    keyId:      r.keyId,
    name:       r.name,
    nodeId:     r.nodeId,
    active:     r.active,
    expiresAt:  r.expiresAt,
    lastUsedAt: r.lastUsedAt,
    createdAt:  r.createdAt,
  }
}

export function toAdminUser(r: AdminUserResponse): AdminUser {
  return {
    id:     r.id,
    email:  r.email,
    role:   r.role as AdminRole,
    active: r.isActive ?? false,
  }
}
