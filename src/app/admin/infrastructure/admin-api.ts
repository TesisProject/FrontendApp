import { httpClient } from '../../shared/infrastructure/http-client'
import type {
  AdminZoneResponse, AdminZoneRequest,
  AdminCameraResponse, AdminCameraCreateRequest, AdminCameraUpdateRequest,
  AdminUserResponse, AdminUserProfileResponse, AdminUserProfileRequest,
  AdminNodeResponse, AdminNodeCreateRequest, AdminNodeUpdateRequest,
  AdminApiKeyResponse, AdminApiKeyCreateRequest, AdminCreatedApiKeyResponse,
  MonitoredSpaceResponse, PointResponse,
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

  // Cameras — /api/v1/occupancy/cameras (única ruta de vision que publica el gateway)
  getCameras(): Promise<AdminCameraResponse[]> {
    return httpClient.get('/occupancy/cameras')
  }
  createCamera(body: AdminCameraCreateRequest): Promise<AdminCameraResponse> {
    return httpClient.post('/occupancy/cameras', body)
  }
  updateCamera(id: number, body: AdminCameraUpdateRequest): Promise<AdminCameraResponse> {
    return httpClient.put(`/occupancy/cameras/${id}`, body)
  }
  deleteCamera(id: number): Promise<void> {
    return httpClient.delete(`/occupancy/cameras/${id}`)
  }

  // Fog nodes — /api/v1/occupancy/nodes
  getNodes(): Promise<AdminNodeResponse[]> {
    return httpClient.get('/occupancy/nodes')
  }
  createNode(body: AdminNodeCreateRequest): Promise<AdminNodeResponse> {
    return httpClient.post('/occupancy/nodes', body)
  }
  updateNode(id: number, body: AdminNodeUpdateRequest): Promise<AdminNodeResponse> {
    return httpClient.put(`/occupancy/nodes/${id}`, body)
  }
  deleteNode(id: number): Promise<void> {
    return httpClient.delete(`/occupancy/nodes/${id}`)
  }

  // API keys — /api/v1/iam/api-keys (la key completa solo se muestra al crearla)
  getApiKeys(): Promise<AdminApiKeyResponse[]> {
    return httpClient.get('/iam/api-keys')
  }
  createApiKey(body: AdminApiKeyCreateRequest): Promise<AdminCreatedApiKeyResponse> {
    return httpClient.post('/iam/api-keys', body)
  }
  revokeApiKey(id: number): Promise<void> {
    return httpClient.delete(`/iam/api-keys/${id}`)
  }

  // Monitored spaces (ROI) — /api/v1/occupancy/spaces
  getMonitoredSpace(parkingSpaceId: number): Promise<MonitoredSpaceResponse> {
    return httpClient.get(`/occupancy/spaces/${parkingSpaceId}`)
  }
  updateSpaceRoi(parkingSpaceId: number, roi: PointResponse[]): Promise<MonitoredSpaceResponse> {
    return httpClient.put(`/occupancy/spaces/${parkingSpaceId}/roi`, { roi })
  }
  unmonitorSpace(parkingSpaceId: number): Promise<void> {
    return httpClient.delete(`/occupancy/spaces/${parkingSpaceId}`)
  }
}

export const adminApi = new AdminApi()
