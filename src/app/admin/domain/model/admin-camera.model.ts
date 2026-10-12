import type { CameraRotation, CaptureSettings, FirmwareStatus } from '../camera-device'

/** Firmware de la cámara: la versión que le asignó la nube frente a la que informa. */
export interface AdminCameraFirmwareState {
  target:     number | null
  reported:   number | null
  reportedAt: string | null
  status:     FirmwareStatus
}

export interface AdminCamera {
  id:       number
  code:     string
  nodeId:   number | null
  zoneId:   number
  name:     string
  location: string
  active:   boolean
  /** MAC STA normalizada; `null` en cámaras anteriores a la MAC obligatoria. */
  mac:                  string | null
  rotation:             CameraRotation
  /** `null` = la cámara conserva la WiFi que tenga. */
  wifiNetworkId:        number | null
  capture:              CaptureSettings
  enrollmentGeneration: number
  firmware:             AdminCameraFirmwareState
}

/** Datos generales (PUT /cameras/{id}). */
export interface AdminCameraForm {
  zoneId:   number | ''
  nodeId:   number | ''
  name:     string
  location: string
  active:   boolean
}

/** Configuración del dispositivo (PUT /cameras/{id}/device-settings). `mac` tal como se escribe. */
export interface AdminCameraDeviceForm {
  mac:           string
  rotation:      CameraRotation
  wifiNetworkId: number | ''
  capture:       CaptureSettings
}

/** Alta: datos generales + dispositivo en un solo POST. */
export type AdminCameraCreateForm = AdminCameraForm & AdminCameraDeviceForm
