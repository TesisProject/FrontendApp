import { httpClient } from '../../shared/infrastructure/http-client'
import type {
  AdminZoneResponse, AdminZoneRequest,
  AdminCameraResponse, AdminCameraCreateRequest, AdminCameraUpdateRequest,
  AdminUserResponse, AdminUserProfileResponse, AdminUserProfileRequest,
} from './admin-response'
import type { AdminCameraAlert } from '../domain/model/admin-camera-alert.model'
import type { AdminSpaceResponse } from './admin-response'

export class AdminApi {
  // Zones — /api/v1/parking/zones
  getZones(): Promise<AdminZoneResponse[]> {
    return httpClient.get('/parking/zones')
  }
  createZone(body: AdminZoneRequest): Promise<AdminZoneResponse> {
    return httpClient.post('/parking/zones', body)
  }
  updateZone(id: number, body: AdminZoneRequest): Promise<AdminZoneResponse> {
    return httpClient.put(`/parking/zones/${id}`, body)
  }
  deleteZone(id: number): Promise<void> {
    return httpClient.delete(`/parking/zones/${id}`)
  }

  // Users — /api/v1/iam/users
  getUsers(): Promise<AdminUserResponse[]> {
    return httpClient.get('/iam/users')
  }
  updateUserRole(id: number, roleName: string): Promise<AdminUserResponse> {
    return httpClient.put(`/iam/users/${id}/role`, { roleName })
  }
  toggleUserStatus(id: number, active: boolean): Promise<AdminUserResponse> {
    return httpClient.put(`/iam/users/${id}/status`, { active })
  }
  getUserProfile(id: number): Promise<AdminUserProfileResponse> {
    return httpClient.get(`/iam/users/${id}/profile`)
  }
  updateUserProfile(id: number, body: AdminUserProfileRequest): Promise<AdminUserProfileResponse> {
    return httpClient.put(`/iam/users/${id}/profile`, body)
  }

  // Spaces — /api/v1/parking/spaces
  getSpacesByZone(zoneId: number): Promise<AdminSpaceResponse[]> {
    return httpClient.get(`/parking/spaces?zoneId=${zoneId}`)
  }
  createSpace(zoneId: number, spaceNumber: string): Promise<AdminSpaceResponse> {
    return httpClient.post('/parking/spaces', { zoneId, spaceNumber })
  }
  deleteSpace(spaceId: number): Promise<void> {
    return httpClient.delete(`/parking/spaces/${spaceId}`)
  }

  // Camera alerts — /api/v1/notifications/camera-alerts
  getCameraAlerts(): Promise<AdminCameraAlert[]> {
    return httpClient.get('/notifications/camera-alerts')
  }
  acknowledgeAlert(alertId: number, acknowledgedBy: number): Promise<void> {
    return httpClient.patch(`/notifications/camera-alerts/${alertId}/acknowledge`, { acknowledgedBy })
  }
  resolveAlert(alertId: number, resolutionNote: string): Promise<void> {
    return httpClient.patch(`/notifications/camera-alerts/${alertId}/resolve`, { resolutionNote })
  }

  // Cameras — /api/v1/vision/cameras
  getCameras(): Promise<AdminCameraResponse[]> {
    return httpClient.get('/vision/cameras')
  }
  createCamera(body: AdminCameraCreateRequest): Promise<AdminCameraResponse> {
    return httpClient.post('/vision/cameras', body)
  }
  updateCamera(id: number, body: AdminCameraUpdateRequest): Promise<AdminCameraResponse> {
    return httpClient.put(`/vision/cameras/${id}`, body)
  }
  deleteCamera(id: number): Promise<void> {
    return httpClient.delete(`/vision/cameras/${id}`)
  }
}

export const adminApi = new AdminApi()
