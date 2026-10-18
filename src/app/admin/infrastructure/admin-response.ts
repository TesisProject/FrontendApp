/** Zona estática del catálogo de parking. La ocupación viva viene de vision (availability). */
export interface AdminZoneResponse {
  id:            number
  name:          string
  street:        string
  district:      string
  city:          string
  latitude:      number
  longitude:     number
  totalSpaces:   number
  totalCapacity: number
  active:        boolean
}

export interface AdminZoneRequest {
  name:          string
  street:        string
  district:      string
  city:          string
  latitude:      number
  longitude:     number
  totalSpaces:   number
  totalCapacity: number
}

/** CaptureSettingsResource / CaptureSettingsRequest — `framesize` ∈ QVGA, VGA, SVGA, XGA. */
export interface CaptureSettingsDto {
  intervalSec: number
  framesize:   string
  jpegQuality: number
}

/** CameraResource — /occupancy/cameras (ver API-Frontend.md). */
export interface AdminCameraResponse {
  id:        number
  code:      string
  nodeId:    number | null
  zoneId:    number
  name:      string | null
  location:  string | null
  active:    boolean
  /** MAC STA `AA:BB:CC:DD:EE:FF`; `null` en cámaras anteriores a la MAC obligatoria. */
  mac:                     string | null
  rotation:                number
  capture:                 CaptureSettingsDto
  enrollmentGeneration:    number
  targetFirmwareVersion:   number | null
  reportedFirmwareVersion: number | null
  firmwareReportedAt:      string | null
  firmwareStatus:          string
  /** Última batería válida; `null` si nunca envió una. */
  battery:                 CameraBatteryDto | null
  createdAt: string
  updatedAt: string
}

/** CameraResource.Battery — `state` ∈ OK, LOW, CRITICAL; `stale` si tiene más de BATTERY_STALE_AFTER_MINUTES. */
export interface CameraBatteryDto {
  mv:         number | null
  percent:    number | null
  state:      string
  capturedAt: string
  stale:      boolean
}

/**
 * RegisterCameraRequest — `zoneId` y `mac` son obligatorios (la MAC, además, única). El `code`
 * (CAM-001…) lo genera el Cloud. Sin `rotation`/`capture` el backend pone 0 y 300 s · SVGA · 12.
 */
export interface AdminCameraCreateRequest {
  nodeId?:        number
  zoneId:         number
  name?:          string
  location?:      string
  mac:            string
  rotation?:      number
  capture?:       CaptureSettingsDto
}

/**
 * UpdateCameraDeviceSettingsRequest — reemplaza los tres datos. `mac` solo puede ser `null` si la
 * cámara aún no tiene. La WiFi no está aquí: se graba en cada placa por USB.
 */
export interface AdminCameraDeviceSettingsRequest {
  mac:      string | null
  rotation: number
  capture:  CaptureSettingsDto
}

/** CameraConfigResource — solo lo que usa el panel: los espacios con ROI que cubre la cámara. */
export interface CameraConfigResponse {
  cameraId: number
  spaces:   { parkingSpaceId: number }[]
}

/** UpdateCameraRequest — `zoneId` y `active` son obligatorios. */
export interface AdminCameraUpdateRequest {
  nodeId?:   number
  zoneId:    number
  name?:     string
  location?: string
  active:    boolean
}

export interface AdminUserResponse {
  id:        number
  email:     string
  role:      string
  isActive:  boolean
  createdAt?: string
}

export interface AdminUserProfileResponse {
  userId:     number
  firstName?: string
  lastName?:  string
  phone?:     string
  avatarUrl?: string
  bio?:       string
}

export interface AdminUserProfileRequest {
  firstName?: string
  lastName?:  string
  phone?:     string
}

/** Espacio del catálogo de parking (solo definición). El estado vivo viene de vision. */
export interface AdminSpaceResponse {
  id:          number
  zoneId:      number
  spaceNumber: string
  createdAt:   string
  updatedAt:   string
}

/** NodeResource — /occupancy/nodes (ver API-Frontend.md). */
export interface AdminNodeResponse {
  id:        number
  code:      string
  name:      string | null
  location:  string | null
  active:    boolean
  createdAt: string
  updatedAt: string
}

/** RegisterNodeRequest — el `code` (FOG-001…) lo genera el Cloud. */
export interface AdminNodeCreateRequest {
  name?:     string
  location?: string
}

/** UpdateNodeRequest — `active` es obligatorio. */
export interface AdminNodeUpdateRequest {
  name?:     string
  location?: string
  active:    boolean
}

/** ApiKeyResource — /iam/api-keys (metadata, sin secretos). */
export interface AdminApiKeyResponse {
  id:         number
  keyId:      string
  name:       string
  /** Rol de sistema: `FOG` o `PREDICTION`. */
  role:       string
  nodeId:     number | null
  active:     boolean
  expiresAt:  string | null
  lastUsedAt: string | null
  createdAt:  string
}

/**
 * CreateApiKeyRequest — `name` es obligatorio. `nodeId` es obligatorio con `role: FOG` (la key solo
 * accede a ese nodo) y prohibido con `PREDICTION`.
 */
export interface AdminApiKeyCreateRequest {
  name:       string
  role:       'FOG' | 'PREDICTION'
  nodeId?:    number
  expiresAt?: string
}

/**
 * FirmwareReleaseResource — /occupancy/firmware-releases. `size` en bytes, `sha256` en hex
 * minúsculas, `signature` ECDSA P-256 en Base64. El path usa la versión, no el id.
 */
export interface FirmwareReleaseResponse {
  id:           number
  version:      number
  hardware:     string
  size:         number
  sha256:       string
  signature:    string
  signingKeyId: string
  notes:        string | null
  createdAt:    string
}

/** CameraFirmwareResource — /occupancy/cameras/{id}/firmware. */
export interface CameraFirmwareResponse {
  cameraId:                 number
  code:                     string
  targetFirmwareVersion:    number | null
  targetFirmwareAssignedAt: string | null
  reportedFirmwareVersion:  number | null
  firmwareReportedAt:       string | null
  status:                   string
}

/** CreatedApiKeyResource — la key completa se muestra una sola vez. */
export interface AdminCreatedApiKeyResponse {
  apiKey:   string
  metadata: AdminApiKeyResponse
}

/** PointResource — vértice de un ROI en coordenadas normalizadas 0–1. */
export interface PointResponse {
  x: number
  y: number
}

/**
 * MonitoredSpaceResource — /occupancy/spaces/{parkingSpaceId}. El ROI pertenece a la cámara que cubre
 * el espacio y está en coordenadas normalizadas de su foto YA girada según `rotation`.
 */
export interface MonitoredSpaceResponse {
  parkingSpaceId: number
  zoneId:         number
  cameraId:       number
  spaceNumber:    string
  occupied:       boolean
  roi:            PointResponse[]
}

/**
 * UpdateSpaceRoiRequest — asigna el espacio a una cámara (de su misma zona) con su ROI; si ya estaba
 * monitoreado, reemplaza cámara y polígono.
 */
export interface UpdateSpaceRoiRequest {
  cameraId: number
  roi:      PointResponse[]
}

/**
 * CameraScreenshotResource — última foto de la cámara (URL presignada de R2). `rotation` son los grados
 * (sentido horario) que hay que girarla para verla derecha.
 */
export interface CameraScreenshotResponse {
  cameraId:         number
  cameraCode:       string
  url:              string
  capturedAt:       string
  rotation:         number
  expiresInSeconds: number
}
