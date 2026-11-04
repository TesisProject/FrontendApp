import type { ZoneClassification } from './model/zone.model'

/**
 * Fuente única de verdad para la paleta y los labels de clasificación de zonas (HU-12).
 * Los hex coinciden con los tokens CSS `--zone-*` definidos en `src/style.css`.
 * Umbrales del backend: libre < 40 %, moderado 40–80 %, ocupado > 80 %; sin datos = gris.
 */
export const CLASSIFICATION_COLOR: Record<ZoneClassification, string> = {
  LIBRE: '#38a169',
  MODERADO: '#d69e2e',
  OCUPADO: '#e53e3e',
  SIN_DATOS: '#a0aec0',
}

export const CLASSIFICATION_LABEL: Record<ZoneClassification, string> = {
  LIBRE: 'Libre',
  MODERADO: 'Moderado',
  OCUPADO: 'Ocupado',
  SIN_DATOS: 'Sin datos',
}

/** Rango de ocupación de cada clasificación, para la leyenda del mapa. */
export const CLASSIFICATION_RANGE: Record<ZoneClassification, string> = {
  LIBRE: 'menos del 40 %',
  MODERADO: 'del 40 % al 80 %',
  OCUPADO: 'más del 80 %',
  SIN_DATOS: 'sin lecturas recientes',
}

export const CLASSIFICATIONS: readonly ZoneClassification[] = ['LIBRE', 'MODERADO', 'OCUPADO', 'SIN_DATOS']

const KNOWN = new Set<string>(CLASSIFICATIONS)

/** Lo que mande el backend; un valor desconocido o ausente se trata como "Sin datos". */
export function toClassification(value: string | null | undefined): ZoneClassification {
  return value && KNOWN.has(value) ? (value as ZoneClassification) : 'SIN_DATOS'
}

export function classificationColor(c: ZoneClassification): string {
  return CLASSIFICATION_COLOR[c] ?? CLASSIFICATION_COLOR.SIN_DATOS
}

export function classificationLabel(c: ZoneClassification): string {
  return CLASSIFICATION_LABEL[c] ?? CLASSIFICATION_LABEL.SIN_DATOS
}
