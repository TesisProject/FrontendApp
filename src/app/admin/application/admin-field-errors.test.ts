import { describe, expect, it } from 'vitest'
import { validationFieldErrors } from './admin-field-errors'

const apiError = (error: string, message: string) => ({ status: 400, error, message })

describe('validationFieldErrors', () => {
  it('mapea cada campo del VALIDATION_ERROR a su mensaje', () => {
    const errors = validationFieldErrors(
      apiError('VALIDATION_ERROR', 'name: must not be blank, totalSpaces: must be greater than or equal to 1'),
      { name: 'El nombre es obligatorio' },
    )
    expect(errors).toEqual({ name: 'El nombre es obligatorio', totalSpaces: 'Valor no válido' })
  })

  it('usa el campo raíz de un error anidado', () => {
    const errors = validationFieldErrors(apiError('VALIDATION_ERROR', 'openingHours[0].opensAt: must not be null'))
    expect(Object.keys(errors)).toEqual(['openingHours'])
  })

  it('ignora otros códigos de error', () => {
    expect(validationFieldErrors(apiError('ZONE_NOT_FOUND', 'name: x'))).toEqual({})
    expect(validationFieldErrors(new Error('red'))).toEqual({})
  })
})
