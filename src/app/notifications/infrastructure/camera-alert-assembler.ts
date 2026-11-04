import type {
  AlertSeverity, CameraAlert, CameraAlertInboxItem, CameraAlertType,
} from '../domain/model/camera-alert.model'
import type { CameraAlertInboxItemResponse, CameraAlertResponse } from './camera-alert-response'

function cameraLabel(r: CameraAlertResponse): string {
  if (!r.cameraCode) return `Cámara ${r.cameraId}`
  return r.cameraName ? `${r.cameraCode} (${r.cameraName})` : r.cameraCode
}

export function toCameraAlert(r: CameraAlertResponse): CameraAlert {
  return {
    id:                r.id,
    cameraId:          r.cameraId,
    cameraLabel:       cameraLabel(r),
    zoneId:            r.zoneId,
    zoneLabel:         r.zoneName ? r.zoneName : `Zona ${r.zoneId}`,
    type:              r.alertType as CameraAlertType,
    severity:          r.severity as AlertSeverity,
    detectedAt:        r.detectedAt,
    lastFrameAt:       r.lastFrameAt,
    secondAlertSentAt: r.secondAlertSentAt,
    acknowledgedBy:    r.acknowledgedBy,
    acknowledgedAt:    r.acknowledgedAt,
    resolvedAt:        r.resolvedAt,
    resolutionNote:    r.resolutionNote,
  }
}

export function toInboxItem(r: CameraAlertInboxItemResponse): CameraAlertInboxItem {
  return { notificationId: r.notificationId, sentAt: r.sentAt, alert: toCameraAlert(r.alert) }
}
