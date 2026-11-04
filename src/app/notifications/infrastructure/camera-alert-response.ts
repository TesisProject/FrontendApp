/** `CameraAlertResource` del backend (`/notifications/camera-alerts`). */
export interface CameraAlertResponse {
  id:                number
  cameraId:          number
  cameraCode:        string | null
  cameraName:        string | null
  zoneId:            number
  zoneName:          string | null
  alertType:         string
  severity:          string
  detectedAt:        string
  lastFrameAt:       string | null
  secondAlertSentAt: string | null
  acknowledgedBy:    number | null
  acknowledgedAt:    string | null
  resolvedAt:        string | null
  resolutionNote:    string | null
  createdAt:         string | null
}

/** `CameraAlertInboxItemResource` (`/notifications/camera-alerts/mine`). */
export interface CameraAlertInboxItemResponse {
  notificationId: number
  sentAt:         string
  read:           boolean
  alert:          CameraAlertResponse
}
