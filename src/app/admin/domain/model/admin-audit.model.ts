/** Acciones del log de auditoría (`AuditAction` del backend). */
export const AUDIT_ACTIONS = [
  'ZONE_CREATED', 'ZONE_UPDATED', 'ZONE_DELETED',
  'CAMERA_REGISTERED', 'CAMERA_UPDATED', 'CAMERA_ACTIVATED', 'CAMERA_DEACTIVATED',
  'USER_ROLE_CHANGED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
  'MODEL_RETRAIN_REQUESTED', 'MODEL_RETRAIN_FAILED',
  'CAMERA_ALERT_OPENED', 'CAMERA_ALERT_ESCALATED', 'CAMERA_ALERT_ACKNOWLEDGED', 'CAMERA_ALERT_RESOLVED',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  ZONE_CREATED:            'Zona creada',
  ZONE_UPDATED:            'Zona actualizada',
  ZONE_DELETED:            'Zona eliminada',
  CAMERA_REGISTERED:       'Cámara registrada',
  CAMERA_UPDATED:          'Cámara actualizada',
  CAMERA_ACTIVATED:        'Cámara activada',
  CAMERA_DEACTIVATED:      'Cámara desactivada',
  USER_ROLE_CHANGED:       'Rol de usuario cambiado',
  USER_ACTIVATED:          'Usuario activado',
  USER_DEACTIVATED:        'Usuario desactivado',
  MODEL_RETRAIN_REQUESTED: 'Reentrenamiento solicitado',
  MODEL_RETRAIN_FAILED:    'Reentrenamiento fallido',
  CAMERA_ALERT_OPENED:     'Alerta de cámara abierta',
  CAMERA_ALERT_ESCALATED:  'Alerta de cámara escalada (2.º aviso)',
  CAMERA_ALERT_ACKNOWLEDGED: 'Alerta de cámara reconocida',
  CAMERA_ALERT_RESOLVED:   'Alerta de cámara resuelta',
}

/** Etiqueta de una acción; una que el panel todavía no conoce se muestra tal cual. */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action as AuditAction] ?? action
}

export interface AuditEntry {
  id:          number
  occurredAt:  string
  /** `null` = la acción la hizo un proceso del sistema (scheduler). */
  actorEmail:  string | null
  action:      string
  entityType:  string
  entityId:    string | null
  zoneId:      number | null
  detail:      string | null
}

/** Filtros de la vista. Fechas `YYYY-MM-DD` en hora local, ambas inclusivas; `''` = sin filtro. */
export interface AuditFilters {
  from:   string
  to:     string
  zoneId: number | ''
  action: AuditAction | ''
}

export interface AuditPage {
  items:         AuditEntry[]
  page:          number
  size:          number
  totalElements: number
}
