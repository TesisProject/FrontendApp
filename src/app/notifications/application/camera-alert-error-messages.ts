import { errorCode } from '../../shared/infrastructure/http-client'
import { adminErrorMessage } from '../../admin/application/admin-error-messages'

const MESSAGES: Record<string, string> = {
  CAMERA_ALERT_NOT_FOUND:              'La alerta ya no existe. Recarga la página',
  CAMERA_ALERT_ALREADY_RESOLVED:       'La alerta ya estaba resuelta (quizá la cámara volvió y se cerró sola)',
  CAMERA_ALERT_NOTIFICATION_NOT_FOUND: 'El aviso ya no existe. Recarga la página',
}

/** Mensaje en español para un error de las alertas; el resto, los del panel. */
export function cameraAlertErrorMessage(error: unknown, fallback?: string): string {
  const code = errorCode(error)
  if (code && MESSAGES[code]) return MESSAGES[code]
  return adminErrorMessage(error, fallback)
}
