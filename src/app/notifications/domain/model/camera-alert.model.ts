export type CameraAlertType =
  | 'CAMERA_OFFLINE'
  | 'BATTERY_LOW'
  | 'OBSTRUCTION_DETECTED'
  | 'UNAUTHORIZED_VEHICLE'
  | 'SYSTEM_ERROR'

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/** Alerta operacional de una cámara (HU-17). Horas en ISO-8601 UTC. */
export interface CameraAlert {
  id:                number
  cameraId:          number
  /** "CAM-001 (Entrada)", o el id si la cámara ya no existe. */
  cameraLabel:       string
  zoneId:            number
  /** Nombre de la zona, o "Zona {id}" si ya no existe. */
  zoneLabel:         string
  type:              CameraAlertType
  severity:          AlertSeverity
  detectedAt:        string
  /** Última imagen recibida antes de caer (solo CAMERA_OFFLINE). */
  lastFrameAt:       string | null
  secondAlertSentAt: string | null
  acknowledgedBy:    number | null
  acknowledgedAt:    string | null
  resolvedAt:        string | null
  resolutionNote:    string | null
}

/** Un aviso no leído de la campana del usuario. */
export interface CameraAlertInboxItem {
  notificationId: number
  sentAt:         string
  alert:          CameraAlert
}

export type CameraAlertStatus = 'open' | 'acknowledged' | 'resolved'

export function alertStatus(alert: CameraAlert): CameraAlertStatus {
  if (alert.resolvedAt) return 'resolved'
  if (alert.acknowledgedAt) return 'acknowledged'
  return 'open'
}

const TYPE_LABELS: Record<CameraAlertType, string> = {
  CAMERA_OFFLINE:       'Cámara sin señal',
  BATTERY_LOW:          'Batería baja',
  OBSTRUCTION_DETECTED: 'Obstrucción',
  UNAUTHORIZED_VEHICLE: 'Vehículo no autorizado',
  SYSTEM_ERROR:         'Error del sistema',
}

export function alertTypeLabel(type: string): string {
  return TYPE_LABELS[type as CameraAlertType] ?? type
}
