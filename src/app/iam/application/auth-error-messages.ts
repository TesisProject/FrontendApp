import { errorCode, errorStatus } from '../../shared/infrastructure/http-client'

/**
 * Mensajes de error de registro y recuperación, por código del backend (`ApiError.error`). Ninguno
 * revela datos de una cuenta: el de correo duplicado solo dice que está en uso (HU-02) y la
 * recuperación no distingue un correo no registrado de un código vencido (HU-03).
 */
export const OTP_EXPIRED_MESSAGE = 'El código ya no es válido (venció, ya se usó o superó los 5 intentos). Solicita uno nuevo.'

const MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: 'Este correo ya está en uso. Inicia sesión o recupera tu contraseña.',
  INVALID_OTP:         'El código no es correcto. Revisa el correo e inténtalo de nuevo.',
  OTP_EXPIRED:         OTP_EXPIRED_MESSAGE,
  TOO_MANY_REQUESTS:   'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
  VALIDATION_ERROR:    'Revisa los datos ingresados.',
}

export function authErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error)
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (errorStatus(error) === 429) return MESSAGES.TOO_MANY_REQUESTS
  return fallback
}

/** `true` si el error es de código vencido/usado/agotado: la vista ofrece pedir uno nuevo. */
export function isOtpExpired(error: unknown): boolean {
  return errorCode(error) === 'OTP_EXPIRED'
}
