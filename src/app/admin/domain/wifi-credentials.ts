/**
 * Reglas de las redes WiFi de un nodo, espejo de `WifiNetwork.requireValidSsid` y `WifiPassphrase`
 * del backend: son las que acepta `WiFi.begin()` en la ESP32.
 */

/** Límite de 802.11: el SSID son 32 bytes, no 32 caracteres. */
export const MAX_SSID_BYTES = 32

const encoder = new TextEncoder()

export function ssidByteLength(ssid: string): number {
  return encoder.encode(ssid).length
}

export function validateSsid(ssid: string): string | null {
  if (ssid.length === 0) return 'El SSID es obligatorio'
  if (ssidByteLength(ssid) > MAX_SSID_BYTES) return 'Máximo 32 bytes (las tildes y la ñ cuentan doble)'
  return null
}

const HEX_PSK = /^[0-9A-Fa-f]{64}$/
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/

/** WPA2-PSK: frase de 8 a 63 caracteres ASCII imprimibles, o la PSK de 64 hex. Sin redes abiertas. */
export function validateWifiPassword(password: string): string | null {
  if (password.length === 0) return 'La contraseña es obligatoria: no se admiten redes abiertas'
  if (HEX_PSK.test(password)) return null
  if (password.length < 8 || password.length > 63) return 'De 8 a 63 caracteres, o una clave de 64 dígitos hexadecimales'
  if (!PRINTABLE_ASCII.test(password)) return 'Solo caracteres ASCII imprimibles (sin tildes ni ñ)'
  return null
}
