import type { BadgeVariants } from '@/app/shared/presentation/components/ui/badge'
import type { ZoneClassification } from '../domain/model/zone.model'

/**
 * Variante de Badge por clasificación: pill tintado + texto oscuro, que cumple
 * AA en texto pequeño (el color sólido + blanco no la cumplía). Los colores de
 * barras, puntos y anillos siguen en `CLASSIFICATION_COLOR` del dominio.
 */
export const CLASSIFICATION_BADGE: Record<ZoneClassification, BadgeVariants['variant']> = {
  LIBRE:    'success',
  MODERADO: 'warning',
  OCUPADO:  'danger',
}
