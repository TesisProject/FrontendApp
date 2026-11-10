import { describe, expect, it } from 'vitest'
import { spaceErrorMessage } from './admin-spaces.store'

describe('spaceErrorMessage', () => {
  it('explica el número duplicado', () => {
    expect(spaceErrorMessage({ status: 409, error: 'SPACE_NUMBER_ALREADY_EXISTS' }, 'A-01'))
      .toBe('Ya existe un espacio con el número A-01 en esta zona')
  })

  it('explica que la zona ya llegó a su total de espacios', () => {
    expect(spaceErrorMessage({ status: 409, error: 'ZONE_SPACE_LIMIT_REACHED' }, 'A-13'))
      .toContain('ya tiene registrados todos sus espacios')
  })

  it('usa el mensaje genérico para otros errores', () => {
    expect(spaceErrorMessage(new Error('network'), 'A-01')).toBe('Error al crear el espacio')
  })
})
