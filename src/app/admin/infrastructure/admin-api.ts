import { httpClient } from '../../shared/infrastructure/http-client'
import type {
  AdminZoneResponse, AdminZoneRequest,
  AdminCameraResponse, AdminCameraCreateRequest, AdminCameraUpdateRequest,
  AdminCameraDeviceSettingsRequest, CameraConfigResponse,
  AdminUserResponse, AdminUserProfileResponse, AdminUserProfileRequest,
  AdminNodeResponse, AdminNodeCreateRequest, AdminNodeUpdateRequest,
  AdminApiKeyResponse, AdminApiKeyCreateRequest, AdminCreatedApiKeyResponse,
  MonitoredSpaceResponse, UpdateSpaceRoiRequest, CameraScreenshotResponse,
  WifiNetworkResponse, WifiNetworkCreateRequest, WifiNetworkUpdateRequest,
  FirmwareReleaseResponse, CameraFirmwareResponse,
} from './admin-response'
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

  // Cameras — /api/v1/occupancy/cameras (única ruta de vision que publica el gateway)
  getCameras(zoneId?: number): Promise<AdminCameraResponse[]> {
    return httpClient.get(zoneId === undefined ? '/occupancy/cameras' : `/occupancy/cameras?zoneId=${zoneId}`)
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
  getCameraScreenshot(id: number): Promise<CameraScreenshotResponse> {
    return httpClient.get(`/occupancy/cameras/${id}/screenshot`)
  }
  getCamera(id: number): Promise<AdminCameraResponse> {
    return httpClient.get(`/occupancy/cameras/${id}`)
  }
  /** Reemplaza MAC, rotación, red y captura. Cambiar una MAC existente reinicia el alta. */
  updateCameraDeviceSettings(id: number, body: AdminCameraDeviceSettingsRequest): Promise<AdminCameraResponse> {
    return httpClient.put(`/occupancy/cameras/${id}/device-settings`, body)
  }
  /** El Fog revoca la credencial de la placa y vuelve a admitir su alta por MAC. */
  resetCameraEnrollment(id: number): Promise<void> {
    return httpClient.delete(`/occupancy/cameras/${id}/enrollment`)
  }
  /** Configuración que descarga el Fog; el panel la usa para saber qué espacios con ROI cubre. */
  getCameraConfig(id: number): Promise<CameraConfigResponse> {
    return httpClient.get(`/occupancy/cameras/${id}/config`)
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

  // WiFi networks — /api/v1/occupancy/nodes/{nodeId}/wifi-networks (escritura solo ADMIN)
  getWifiNetworks(nodeId: number): Promise<WifiNetworkResponse[]> {
    return httpClient.get(`/occupancy/nodes/${nodeId}/wifi-networks`)
  }
  createWifiNetwork(nodeId: number, body: WifiNetworkCreateRequest): Promise<WifiNetworkResponse> {
    return httpClient.post(`/occupancy/nodes/${nodeId}/wifi-networks`, body)
  }
  updateWifiNetwork(nodeId: number, networkId: number, body: WifiNetworkUpdateRequest): Promise<WifiNetworkResponse> {
    return httpClient.put(`/occupancy/nodes/${nodeId}/wifi-networks/${networkId}`, body)
  }
  deleteWifiNetwork(nodeId: number, networkId: number): Promise<void> {
    return httpClient.delete(`/occupancy/nodes/${nodeId}/wifi-networks/${networkId}`)
  }

  // Firmware releases — /api/v1/occupancy/firmware-releases (publicar solo ADMIN)
  getFirmwareReleases(): Promise<FirmwareReleaseResponse[]> {
    return httpClient.get('/occupancy/firmware-releases')
  }
  /** multipart: `file` (.bin de la aplicación), `version` y `notes` opcional. */
  uploadFirmwareRelease(form: FormData, onProgress?: (fraction: number) => void): Promise<FirmwareReleaseResponse> {
    return httpClient.postForm('/occupancy/firmware-releases', form, { onUploadProgress: onProgress })
  }

  // Camera firmware — /api/v1/occupancy/cameras/{id}/firmware
  getCameraFirmware(cameraId: number): Promise<CameraFirmwareResponse> {
    return httpClient.get(`/occupancy/cameras/${cameraId}/firmware`)
  }
  /** 409 FIRMWARE_DOWNGRADE_NOT_ALLOWED si es menor que la asignada o que la informada. */
  assignCameraFirmware(cameraId: number, version: number): Promise<CameraFirmwareResponse> {
    return httpClient.put(`/occupancy/cameras/${cameraId}/firmware/target`, { version })
  }
  clearCameraFirmware(cameraId: number): Promise<void> {
    return httpClient.delete(`/occupancy/cameras/${cameraId}/firmware/target`)
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
  updateSpaceRoi(parkingSpaceId: number, body: UpdateSpaceRoiRequest): Promise<MonitoredSpaceResponse> {
    return httpClient.put(`/occupancy/spaces/${parkingSpaceId}/roi`, body)
  }
  unmonitorSpace(parkingSpaceId: number): Promise<void> {
    return httpClient.delete(`/occupancy/spaces/${parkingSpaceId}`)
  }
}

export const adminApi = new AdminApi()
