/**
 * Vértice de un ROI en coordenadas normalizadas 0–1 de la foto YA girada según `rotation` (así la
 * procesa el Fog: gira el frame y luego aplica el ROI).
 */
export interface RoiPoint {
  x: number
  y: number
}

/**
 * Lo que ve una cámara de la zona: su última foto y los espacios que cubre. Deliberadamente sin
 * código de cámara — al usuario solo le interesa ver sus espacios.
 */
export interface ZoneView {
  id:         number
  imageUrl:   string | null
  capturedAt: string | null
  rotation:   number
  /** Momento (ms) en que caduca la URL presignada de la foto; null si no caduca. */
  expiresAt:  number | null
  spaces:     { spaceId: number; roi: RoiPoint[] }[]
}
