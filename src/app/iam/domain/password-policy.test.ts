import { describe, expect, it } from 'vitest'
import { isStrongPassword, missingPasswordRequirements, passwordPolicyMessage } from './password-policy'

const ids = (pw: string) => missingPasswordRequirements(pw).map(r => r.id)

describe('password-policy (HU-02)', () => {
  it('acepta una contraseña que cumple todo', () => {
    expect(isStrongPassword('Parque2026!')).toBe(true)
    expect(passwordPolicyMessage('Parque2026!')).toBeNull()
  })

  it('indica cada requisito faltante', () => {
    expect(ids('Pa1!abc')).toEqual(['length'])
    expect(ids('parque2026!')).toEqual(['upper'])
    expect(ids('PARQUE2026!')).toEqual(['lower'])
    expect(ids('Parquesito!')).toEqual(['digit'])
    expect(ids('Parque2026')).toEqual(['symbol'])
  })

  it('no cuenta espacios ni letras acentuadas como símbolo', () => {
    expect(ids('Ñandú 2026')).toEqual(['symbol'])
  })

  it('lista todo con una contraseña vacía o nula', () => {
    expect(ids('')).toEqual(['length', 'upper', 'lower', 'digit', 'symbol'])
    expect(missingPasswordRequirements(undefined)).toHaveLength(5)
  })

  it('arma un mensaje con los requisitos faltantes', () => {
    expect(passwordPolicyMessage('parque')).toBe(
      'Falta: al menos 8 caracteres, una letra mayúscula, un número, un símbolo (!, @, #, …)',
    )
  })
})
