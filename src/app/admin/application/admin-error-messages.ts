import { errorCode, errorStatus } from '../../shared/infrastructure/http-client'

/**
 * Mensajes en español para los códigos `ApiError.error` del backend que puede provocar el panel.
 * Se decide por el código y no por `message`, que viene en inglés y pensado para logs.
 */
const MESSAGES: Record<string, string> = {
  // Cámaras
  CAMERA_MAC_REQUIRED:               'La MAC de la placa es obligatoria y, una vez puesta, no se puede quitar (solo cambiar)',
  INVALID_MAC_ADDRESS:               'La MAC no es válida. Cópiala de la línea «WIFI: MAC=» del monitor serie',
  CAMERA_MAC_ALREADY_REGISTERED:     'Esa MAC ya está registrada en otra cámara. Cada placa tiene una MAC única: revisa que no la hayas copiado de otra',
  INVALID_ROTATION:                  'La rotación debe ser 0°, 90°, 180° o 270°',
  INVALID_CAPTURE_SETTINGS:          'Parámetros de captura fuera de rango',
  CAMERA_ZONE_NOT_FOUND:             'La zona elegida ya no existe. Recarga la página',
  WIFI_NETWORK_NOT_IN_CAMERA_NODE:   'La red WiFi elegida no pertenece al nodo de la cámara',
  CAMERA_HAS_MONITORED_SPACES:       'La cámara aún cubre espacios monitoreados: reasígnalos a otra cámara o quítales el ROI primero',
  CAMERA_WIFI_NETWORK_IN_OTHER_NODE: 'La cámara usa una red WiFi de su nodo actual. Quítale la red antes de cambiarla de nodo',
  CAMERA_NOT_FOUND:                  'La cámara ya no existe. Recarga la página',

  // Nodos y redes WiFi
  NODE_NOT_FOUND:                    'El nodo ya no existe. Recarga la página',
  NODE_HAS_WIFI_NETWORKS:            'Este nodo aún tiene redes WiFi. Bórralas antes en «Redes WiFi»',
  WIFI_NETWORK_NOT_FOUND:            'La red ya no existe. Recarga la página',
  INVALID_WIFI_SSID:                 'El SSID no puede estar vacío ni ocupar más de 32 bytes (las tildes y la ñ cuentan doble)',
  INVALID_WIFI_PASSWORD:             'La contraseña debe tener de 8 a 63 caracteres sin tildes ni ñ, o ser una clave de 64 dígitos hexadecimales. No se admiten redes abiertas',
  WIFI_NETWORK_SSID_ALREADY_EXISTS:  'Este nodo ya tiene una red con ese SSID',
  WIFI_NETWORK_IN_USE:               'La usan cámaras de este nodo: asígnales otra red antes de borrarla',
  WIFI_SECRETS_UNAVAILABLE:          'El servidor no tiene configurada la clave de cifrado de contraseñas WiFi. Avisa al responsable del backend (WIFI_SECRETS_ENCRYPTION_KEY)',
  WIFI_SECRETS_KEY_MISMATCH:         'La contraseña guardada de esta red no se puede descifrar con la clave actual del servidor. Vuelve a escribirla',

  // Firmware
  FIRMWARE_RELEASE_NOT_FOUND_FOR_ASSIGNMENT: 'Esa versión no está publicada. Recarga la lista de versiones',
  FIRMWARE_DOWNGRADE_NOT_ALLOWED:    'No se puede bajar de versión: la cámara ya tiene asignada o instalada una mayor. Para corregir una versión, publica otra con número mayor',
  FIRMWARE_RELEASE_NOT_FOUND:        'Esa versión de firmware no existe',
  INVALID_FIRMWARE_VERSION:          'La versión debe ser un entero mayor que 0',
  INVALID_FIRMWARE_IMAGE:            'El archivo no es una imagen de aplicación ESP32. Sube esp32cam.ino.bin, no el .merged.bin',
  FIRMWARE_TOO_LARGE:                'El firmware no cabe en la ranura OTA (máx. 1.966.080 bytes)',
  INVALID_FIRMWARE_NOTES:            'Las notas no pueden pasar de 1000 caracteres',
  FIRMWARE_VERSION_ALREADY_EXISTS:   'Esa versión ya está publicada. Usa un número mayor',
  FILE_TOO_LARGE:                    'El archivo es demasiado grande',
  FIRMWARE_SIGNING_UNAVAILABLE:      'El servidor no tiene configurada la clave de firma de firmware. Avisa al responsable del backend',
  FIRMWARE_STORAGE_UNAVAILABLE:      'No se pudo guardar el binario en el almacenamiento (R2). Inténtalo más tarde o avisa al responsable del backend',

  // API keys
  API_KEY_NODE_REQUIRED:             'Una key de nodo Fog tiene que estar ligada a un nodo',
  API_KEY_NODE_NOT_FOUND:            'El nodo elegido ya no existe. Recarga la página',
  API_KEY_NODE_NOT_ALLOWED:          'Una key del prediction-engine no se liga a ningún nodo',
  API_KEY_NOT_FOUND:                 'La API key ya no existe. Recarga la página',

  VALIDATION_ERROR:                  'Revisa los campos del formulario',
}

const STATUS_MESSAGES: Record<number, string> = {
  403: 'No tienes permiso para esta acción',
  413: 'El archivo es demasiado grande',
  503: 'El servicio no está disponible. Inténtalo más tarde',
}

/** Mensaje para mostrar de un error rechazado por `httpClient`; `fallback` si no se reconoce. */
export function adminErrorMessage(error: unknown, fallback = 'Ocurrió un error, intenta de nuevo'): string {
  const code = errorCode(error)
  if (code && MESSAGES[code]) return MESSAGES[code]
  const status = errorStatus(error)
  if (status === undefined) {
    // Sin cuerpo ApiError: la petición no llegó al backend.
    return (error as { isAxiosError?: boolean } | null)?.isAxiosError
      ? 'No se pudo conectar con el servidor'
      : fallback
  }
  return STATUS_MESSAGES[status] ?? fallback
}
