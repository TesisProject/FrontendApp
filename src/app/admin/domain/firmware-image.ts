/**
 * Reglas del binario de firmware, espejo de `FirmwareImage` y `FirmwareRelease` del backend. Sirven
 * para rechazar en el navegador el fichero equivocado antes de subir megas.
 */

/** Primer byte de `esp_image_header_t`: el mismo que comprueba `Update` en el core. */
export const ESP_IMAGE_MAGIC = 0xE9
/** Ranura OTA (app0/app1) de la ESP32-CAM AI-Thinker: 0x1E0000. */
export const OTA_SLOT_BYTES = 1_966_080
export const FIRMWARE_NOTES_MAX = 1000
/** Por debajo de esto no es una aplicación con cámara y WiFi (el bootloader ronda los 25 KB). */
const SUSPICIOUSLY_SMALL_BYTES = 64 * 1024
const MAX_INT32 = 2_147_483_647

export interface FirmwareFileFacts {
  name:      string
  size:      number
  /** Primer byte del fichero; `null` si está vacío. */
  firstByte: number | null
}

export interface FirmwareCheck {
  /** Impiden publicar. */
  errors:   string[]
  /** Se muestran, pero no bloquean. */
  warnings: string[]
}

function hex(byte: number): string {
  return `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`
}

export function checkFirmwareImage({ name, size, firstByte }: FirmwareFileFacts): FirmwareCheck {
  const errors: string[] = []
  const warnings: string[] = []
  // El .merged.bin del core empieza por el relleno 0xFF previo al bootloader.
  const looksMerged = firstByte === 0xFF || /merged/i.test(name)

  if (size === 0 || firstByte === null) {
    errors.push('El archivo está vacío')
    return { errors, warnings }
  }
  if (firstByte !== ESP_IMAGE_MAGIC) {
    errors.push(
      `No es una imagen de aplicación ESP32 (empieza por ${hex(firstByte)}, debería ser ${hex(ESP_IMAGE_MAGIC)})` +
      (looksMerged ? ': parece el .merged.bin. Sube esp32cam.ino.bin' : ''),
    )
  }
  if (size > OTA_SLOT_BYTES) {
    errors.push(`No cabe en la ranura OTA: ${size.toLocaleString('es-PE')} bytes de ${OTA_SLOT_BYTES.toLocaleString('es-PE')} como máximo`)
  }
  if (!/\.bin$/i.test(name)) warnings.push('El archivo no tiene extensión .bin')
  // El bootloader también empieza por 0xE9: el byte mágico no basta para distinguirlo.
  if (/bootloader|partitions/i.test(name) || (firstByte === ESP_IMAGE_MAGIC && size < SUSPICIOUSLY_SMALL_BYTES)) {
    warnings.push('Parece el bootloader o la tabla de particiones, no la aplicación. Sube esp32cam.ino.bin')
  }
  return { errors, warnings }
}

/** Porcentaje de la ranura OTA que ocupa un binario. */
export function otaSlotPercent(size: number): number {
  return Math.round((size / OTA_SLOT_BYTES) * 100)
}

export function validateFirmwareVersion(version: number | '', published: readonly number[]): string | null {
  if (version === '' || !Number.isInteger(version) || version <= 0) return 'La versión debe ser un entero mayor que 0'
  if (version > MAX_INT32) return 'Versión demasiado grande'
  if (published.includes(version)) return `La v${version} ya está publicada. Usa un número mayor`
  return null
}
