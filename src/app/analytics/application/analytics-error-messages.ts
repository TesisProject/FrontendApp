import { errorCode, errorStatus } from '../../shared/infrastructure/http-client'

/** Mensajes en español para los códigos `ApiError.error` de la analítica (HU-19, 20 y 21). */
const MESSAGES: Record<string, string> = {
  INVALID_STATISTICS_PERIOD: 'El período debe ser semana, mes o año',
  INVALID_PEAK_GROUPING:     'Solo se puede agrupar por hora o por día',
  INVALID_ANALYTICS_RANGE:   'El rango de fechas no es válido o es demasiado largo. Acórtalo e inténtalo otra vez',
  ZONE_NOT_FOUND:            'La zona ya no existe. Recarga la página',
  ACCESS_DENIED:             'Solo un administrador puede ver esta información',
}

export function analyticsErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error)
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (errorStatus(error) === 403) return MESSAGES.ACCESS_DENIED
  return fallback
}
