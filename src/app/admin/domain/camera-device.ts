/**
 * Reglas del dispositivo de una cámara (ESP32-CAM): MAC, rotación, captura y estado de firmware.
 * Son espejo de las del backend (cloud-service, contexto occupancy) para avisar antes de enviar; el
 * backend sigue siendo la autoridad.
 */

export const CAMERA_ROTATIONS = [0, 90, 180, 270] as const
export type CameraRotation = typeof CAMERA_ROTATIONS[number]

export function isCameraRotation(value: number): value is CameraRotation {
  return (CAMERA_ROTATIONS as readonly number[]).includes(value)
}

export const FRAME_SIZES = ['QVGA', 'VGA', 'SVGA', 'XGA'] as const
export type FrameSize = typeof FRAME_SIZES[number]

export const FRAME_SIZE_LABEL: Record<FrameSize, string> = {
  QVGA: 'QVGA · 320×240',
  VGA:  'VGA · 640×480',
  SVGA: 'SVGA · 800×600',
  XGA:  'XGA · 1024×768',
}

export interface CaptureSettings {
  intervalSec: number
  framesize:   FrameSize
  jpegQuality: number
}

/** Rangos que acepta la ESP32 (CaptureSettingsRequest del backend). */
export const CAPTURE_LIMITS = {
  intervalSec: { min: 30, max: 3600 },
  jpegQuality: { min: 10, max: 63 },
} as const

/** Lo que pone el backend si el alta no trae `capture`. */
export const CAPTURE_DEFAULTS: CaptureSettings = { intervalSec: 300, framesize: 'SVGA', jpegQuality: 12 }

export function sameCapture(a: CaptureSettings, b: CaptureSettings): boolean {
  return a.intervalSec === b.intervalSec && a.framesize === b.framesize && a.jpegQuality === b.jpegQuality
}

/** Error de un campo de captura, o `null` si es válido. */
export function captureErrors(c: CaptureSettings): { intervalSec: string | null; jpegQuality: string | null } {
  const inRange = (v: number, { min, max }: { min: number; max: number }) => Number.isInteger(v) && v >= min && v <= max
  return {
    intervalSec: inRange(c.intervalSec, CAPTURE_LIMITS.intervalSec) ? null : 'Entre 30 s y 1 h (3600 s)',
    jpegQuality: inRange(c.jpegQuality, CAPTURE_LIMITS.jpegQuality) ? null : 'Entre 10 (mejor) y 63',
  }
}

const SEPARATED_MAC = /^[0-9A-F]{2}([:-])(?:[0-9A-F]{2}\1){4}[0-9A-F]{2}$/
const BARE_MAC      = /^[0-9A-F]{12}$/

/**
 * MAC de estación normalizada a `AA:BB:CC:DD:EE:FF`, o `null` si no es válida. Acepta dos puntos,
 * guiones (sin mezclarlos) o sin separador, en cualquier caja. Rechaza la nula y las multicast
 * (bit 0 del primer octeto, que incluye la de difusión): es la regla de `MacAddress.parse`.
 */
export function normalizeMac(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase()
  const bare = SEPARATED_MAC.test(trimmed) ? trimmed.replace(/[:-]/g, '') : trimmed
  if (!BARE_MAC.test(bare)) return null
  if ((parseInt(bare.slice(0, 2), 16) & 1) !== 0 || bare === '000000000000') return null
  return bare.match(/../g)!.join(':')
}

export const MAC_INVALID_MSG = 'MAC no válida. Formatos: aa:bb:cc:dd:ee:ff, AA-BB-CC-DD-EE-FF o aabbccddeeff'

export interface DeviceFieldErrors {
  mac:         string | null
  intervalSec: string | null
  jpegQuality: string | null
}

/**
 * Errores del formulario de dispositivo. `macRequired` es falso solo en cámaras antiguas que aún no
 * tienen MAC (el backend admite dejarlas sin ella).
 */
export function deviceFieldErrors(mac: string, capture: CaptureSettings, macRequired: boolean): DeviceFieldErrors {
  const trimmed = mac.trim()
  let macError: string | null = null
  if (trimmed === '') macError = macRequired ? 'La MAC de la placa es obligatoria' : null
  else if (!normalizeMac(trimmed)) macError = MAC_INVALID_MSG
  return { mac: macError, ...captureErrors(capture) }
}

export function hasDeviceErrors(e: DeviceFieldErrors): boolean {
  return !!(e.mac || e.intervalSec || e.jpegQuality)
}

export const FIRMWARE_STATUSES = ['NOT_MANAGED', 'UNKNOWN', 'UP_TO_DATE', 'PENDING', 'BEHIND', 'AHEAD'] as const
export type FirmwareStatus = typeof FIRMWARE_STATUSES[number]

export type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const FIRMWARE_STATUS_META: Record<FirmwareStatus, { label: string; variant: StatusBadgeVariant; help: string }> = {
  NOT_MANAGED: { label: 'Sin gestionar', variant: 'neutral', help: 'No tiene versión asignada: la nube no le ofrece actualizaciones.' },
  UNKNOWN:     { label: 'Sin informe',   variant: 'info',    help: 'Tiene versión asignada, pero la cámara aún no ha informado la suya.' },
  UP_TO_DATE:  { label: 'Al día',        variant: 'success', help: 'Informa la versión asignada.' },
  PENDING:     { label: 'Pendiente',     variant: 'warning', help: 'Informa una versión menor y aún está dentro del margen para actualizarse.' },
  BEHIND:      { label: 'Atrasada',      variant: 'danger',  help: 'Sigue en una versión menor pasado el margen: la descarga falló o la placa volvió atrás. Revisa el log del Fog.' },
  AHEAD:       { label: 'Adelantada',    variant: 'info',    help: 'Informa una versión mayor que la asignada: se flasheó por USB. Asigna esa versión o una mayor.' },
}

export function isFirmwareStatus(value: string): value is FirmwareStatus {
  return (FIRMWARE_STATUSES as readonly string[]).includes(value)
}

/** Menor versión que se puede asignar: no se baja ni de la asignada ni de la informada. */
export function minAssignableVersion(target: number | null, reported: number | null): number {
  return Math.max(target ?? 0, reported ?? 0)
}
