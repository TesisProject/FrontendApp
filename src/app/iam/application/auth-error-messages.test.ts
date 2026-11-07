import { describe, expect, it } from 'vitest'
import { authErrorMessage, isOtpExpired, OTP_EXPIRED_MESSAGE } from './auth-error-messages'
import { validationFieldErrors } from '../../shared/helpers/api-errors'

describe('auth-error-messages', () => {
  it('correo duplicado: mensaje genérico sin datos de la cuenta (HU-02 E2)', () => {
    const msg = authErrorMessage({ status: 409, error: 'USER_ALREADY_EXISTS', message: 'The email is already in use' }, 'x')
    expect(msg).toBe('Este correo ya está en uso. Inicia sesión o recupera tu contraseña.')
  })

  it('código vencido o usado: ofrece pedir uno nuevo (HU-03 E3)', () => {
    const err = { status: 400, error: 'OTP_EXPIRED' }
    expect(authErrorMessage(err, 'x')).toBe(OTP_EXPIRED_MESSAGE)
    expect(isOtpExpired(err)).toBe(true)
    expect(isOtpExpired({ status: 400, error: 'INVALID_OTP' })).toBe(false)
  })

  it('credenciales inválidas: mensaje en español sin decir qué campo falló (HU-01 E2)', () => {
    const msg = authErrorMessage({ status: 401, error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }, 'x')
    expect(msg).toBe('Correo o contraseña incorrectos.')
  })

  it('429 sin código conocido', () => {
    expect(authErrorMessage({ status: 429 }, 'x')).toContain('Demasiados intentos')
  })

  it('usa el respaldo para errores desconocidos', () => {
    expect(authErrorMessage(new Error('red'), 'Sin conexión')).toBe('Sin conexión')
  })

  it('separa los errores por campo de un VALIDATION_ERROR (HU-04 E2)', () => {
    const err = {
      error: 'VALIDATION_ERROR',
      message: 'phone: debe tener de 6 a 15 dígitos, con + opcional, firstName: debe tener entre 2 y 100 caracteres',
    }
    expect(validationFieldErrors(err, ['firstName', 'lastName', 'phone', 'bio'])).toEqual({
      phone:     'debe tener de 6 a 15 dígitos, con + opcional',
      firstName: 'debe tener entre 2 y 100 caracteres',
    })
  })

  it('no inventa errores de campo en otros códigos', () => {
    expect(validationFieldErrors({ error: 'USER_NOT_FOUND', message: 'phone: x' }, ['phone'])).toEqual({})
  })
})
