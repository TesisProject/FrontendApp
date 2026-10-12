import type { FirmwareStatus } from '../camera-device'

/** Versión de firmware publicada (firmada por la nube y guardada en R2). */
export interface AdminFirmwareRelease {
  id:           number
  version:      number
  hardware:     string
  size:         number
  sha256:       string
  signingKeyId: string
  notes:        string | null
  createdAt:    string
}

/** Firmware de una cámara con la fecha de asignación (GET /cameras/{id}/firmware). */
export interface AdminCameraFirmware {
  cameraId:   number
  target:     number | null
  assignedAt: string | null
  reported:   number | null
  reportedAt: string | null
  status:     FirmwareStatus
}

export interface AdminFirmwareUploadForm {
  file:    File | null
  version: number | ''
  notes:   string
}
