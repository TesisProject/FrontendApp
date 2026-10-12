import type { AdminZone } from '../domain/model/admin-zone.model'
import type { AdminCamera } from '../domain/model/admin-camera.model'
import type { AdminUser, AdminRole } from '../domain/model/admin-user.model'
import type { AdminNode } from '../domain/model/admin-node.model'
import type { AdminApiKey, ApiKeyRole } from '../domain/model/admin-api-key.model'
import {
  CAPTURE_DEFAULTS, FRAME_SIZES, isCameraRotation, isFirmwareStatus,
  type CaptureSettings, type FrameSize,
} from '../domain/camera-device'
import type {
  AdminZoneResponse, AdminCameraResponse, AdminUserResponse,
  AdminNodeResponse, AdminApiKeyResponse, CaptureSettingsDto, WifiNetworkResponse,
  FirmwareReleaseResponse, CameraFirmwareResponse,
} from './admin-response'
import type { AdminCameraFirmware, AdminFirmwareRelease } from '../domain/model/admin-firmware.model'
import type { AdminWifiNetwork } from '../domain/model/admin-wifi-network.model'
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

export function toCaptureSettings(dto: CaptureSettingsDto | null | undefined): CaptureSettings {
  if (!dto) return { ...CAPTURE_DEFAULTS }
  const framesize = (FRAME_SIZES as readonly string[]).includes(dto.framesize)
    ? dto.framesize as FrameSize
    : CAPTURE_DEFAULTS.framesize
  return { intervalSec: dto.intervalSec, framesize, jpegQuality: dto.jpegQuality }
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
    mac:                  r.mac ?? null,
    rotation:             isCameraRotation(r.rotation) ? r.rotation : 0,
    wifiNetworkId:        r.wifiNetworkId ?? null,
    capture:              toCaptureSettings(r.capture),
    enrollmentGeneration: r.enrollmentGeneration ?? 1,
    firmware: {
      target:     r.targetFirmwareVersion ?? null,
      reported:   r.reportedFirmwareVersion ?? null,
      reportedAt: r.firmwareReportedAt ?? null,
      status:     isFirmwareStatus(r.firmwareStatus) ? r.firmwareStatus : 'NOT_MANAGED',
    },
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

export function toAdminFirmwareRelease(r: FirmwareReleaseResponse): AdminFirmwareRelease {
  return {
    id:           r.id,
    version:      r.version,
    hardware:     r.hardware,
    size:         r.size,
    sha256:       r.sha256,
    signingKeyId: r.signingKeyId,
    notes:        r.notes || null,
    createdAt:    r.createdAt,
  }
}

export function toAdminCameraFirmware(r: CameraFirmwareResponse): AdminCameraFirmware {
  return {
    cameraId:   r.cameraId,
    target:     r.targetFirmwareVersion,
    assignedAt: r.targetFirmwareAssignedAt,
    reported:   r.reportedFirmwareVersion,
    reportedAt: r.firmwareReportedAt,
    status:     isFirmwareStatus(r.status) ? r.status : 'NOT_MANAGED',
  }
}

export function toAdminWifiNetwork(r: WifiNetworkResponse): AdminWifiNetwork {
  return {
    id:                r.id,
    nodeId:            r.nodeId,
    ssid:              r.ssid,
    cameraCount:       r.cameraCount,
    passwordUpdatedAt: r.passwordUpdatedAt,
  }
}

export function toAdminApiKey(r: AdminApiKeyResponse): AdminApiKey {
  return {
    id:         r.id,
    keyId:      r.keyId,
    name:       r.name,
    // Las keys anteriores a los roles eran todas de nodo Fog.
    role:       (r.role === 'PREDICTION' ? 'PREDICTION' : 'FOG') as ApiKeyRole,
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
