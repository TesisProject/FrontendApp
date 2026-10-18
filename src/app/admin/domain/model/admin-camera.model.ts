import type { BatteryState, CameraRotation, CaptureSettings, FirmwareStatus } from '../camera-device'

/** Firmware de la cámara: la versión que le asignó la nube frente a la que informa. */
export interface AdminCameraFirmwareState {
  target:     number | null
  reported:   number | null
  reportedAt: string | null
  status:     FirmwareStatus
}

/**
 * Última lectura válida de la celda, de la foto más reciente que la trajo. `percent` es orientativo
 * (±3–5 puntos en la zona plana de la curva): se muestra siempre junto a los mV.
 */
export interface AdminCameraBattery {
  mv:         number
  percent:    number
  state:      BatteryState
  capturedAt: string
  /** La cámara dejó de enviar (lectura de más de 20 min): el % ya no es actual. */
  stale:      boolean
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
  capture:              CaptureSettings
  enrollmentGeneration: number
  firmware:             AdminCameraFirmwareState
  /** `null` si nunca envió una lectura válida (placa sin celda o sin divisor). */
  battery:              AdminCameraBattery | null
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
  mac:      string
  rotation: CameraRotation
  capture:  CaptureSettings
}

/** Alta: datos generales + dispositivo en un solo POST. */
export type AdminCameraCreateForm = AdminCameraForm & AdminCameraDeviceForm
