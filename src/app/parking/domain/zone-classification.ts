import type { ZoneClassification } from './model/zone.model'

/**
 * Fuente única de verdad para la paleta y los labels de clasificación de zonas.
 * Los hex coinciden con los tokens CSS `--zone-*` definidos en `src/style.css`.
 */
export const CLASSIFICATION_COLOR: Record<ZoneClassification, string> = {
  LIBRE: '#38a169',
  MODERADO: '#f2894a',
  OCUPADO: '#e53e3e',
}

export const CLASSIFICATION_LABEL: Record<ZoneClassification, string> = {
  LIBRE: 'Libre',
  MODERADO: 'Moderado',
  OCUPADO: 'Ocupado',
}

export function classificationColor(c: ZoneClassification): string {
  return CLASSIFICATION_COLOR[c]
}

export function classificationLabel(c: ZoneClassification): string {
  return CLASSIFICATION_LABEL[c]
}
