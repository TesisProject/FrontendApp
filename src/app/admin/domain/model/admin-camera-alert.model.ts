export type AlertSeverity  = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type CameraAlertType = 'CAMERA_OFFLINE' | 'OBSTRUCTION_DETECTED' | 'UNAUTHORIZED_VEHICLE' | 'SYSTEM_ERROR'
export type AlertStatus    = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'

export interface AdminCameraAlert {
  id:                 number
  cameraId:           number
  zoneId:             number
  alertType:          CameraAlertType
  severity:           AlertSeverity
  detectedAt:         string
  acknowledgedBy:     number | null
  acknowledgedAt:     string | null
  resolvedAt:         string | null
  resolutionNote:     string | null
  createdAt:          string
}

export function alertStatus(a: AdminCameraAlert): AlertStatus {
  if (a.resolvedAt)    return 'RESOLVED'
  if (a.acknowledgedAt) return 'ACKNOWLEDGED'
  return 'PENDING'
}
