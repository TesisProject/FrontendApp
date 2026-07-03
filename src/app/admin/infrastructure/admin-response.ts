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

/** CameraResource — /occupancy/cameras (ver API-Frontend.md). */
export interface AdminCameraResponse {
  id:        number
  code:      string
  nodeId:    number | null
  zoneId:    number
  name:      string | null
  location:  string | null
  active:    boolean
  createdAt: string
  updatedAt: string
}

/** RegisterCameraRequest — `code` y `zoneId` son obligatorios. */
export interface AdminCameraCreateRequest {
  code:      string
  nodeId?:   number
  zoneId:    number
  name?:     string
  location?: string
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

/** RegisterNodeRequest — `code` es obligatorio. */
export interface AdminNodeCreateRequest {
  code:      string
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
  nodeId:     number | null
  active:     boolean
  expiresAt:  string | null
  lastUsedAt: string | null
  createdAt:  string
}

/** CreateApiKeyRequest — `name` es obligatorio. */
export interface AdminApiKeyCreateRequest {
  name:       string
  nodeId?:    number
  expiresAt?: string
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

/** MonitoredSpaceResource — /occupancy/spaces/{parkingSpaceId} (ROI + estado). */
export interface MonitoredSpaceResponse {
  parkingSpaceId: number
  zoneId:         number
  spaceNumber:    string
  occupied:       boolean
  roi:            PointResponse[]
}

/** UpdateSpaceRoiRequest — crea o reemplaza el ROI de un espacio. */
export interface UpdateSpaceRoiRequest {
  roi: PointResponse[]
}
