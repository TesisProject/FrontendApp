import { describe, expect, it } from 'vitest'
import { avatarFileError, isProfileFormDirty, toProfilePayload, validateProfileForm } from './profile-form'

const valid = { firstName: 'Ana', lastName: 'Pérez', phone: '+51 987 654 321', bio: 'Hola' }

describe('profile-form (HU-04)', () => {
  it('acepta datos válidos', () => {
    expect(validateProfileForm(valid)).toEqual({})
  })

  it('marca solo el campo inválido y conserva los demás', () => {
    expect(validateProfileForm({ ...valid, phone: '12-ab' })).toEqual({
      phone: 'Ingresa de 6 a 15 dígitos, con + opcional',
    })
  })

  it('exige al menos 2 caracteres en nombre y apellido', () => {
    expect(Object.keys(validateProfileForm({ ...valid, firstName: 'A', lastName: ' ' }))).toEqual(['firstName', 'lastName'])
  })

  it('limita la bio a 500 caracteres', () => {
    expect(validateProfileForm({ ...valid, bio: 'x'.repeat(501) })).toHaveProperty('bio')
  })

  it('permite dejar el teléfono vacío', () => {
    expect(validateProfileForm({ ...valid, phone: '' })).toEqual({})
  })

  it('envía el teléfono sin espacios', () => {
    expect(toProfilePayload(valid).phone).toBe('+51987654321')
  })

  it('detecta cambios sin guardar (E3)', () => {
    expect(isProfileFormDirty(valid, { ...valid })).toBe(false)
    expect(isProfileFormDirty({ ...valid, bio: 'Otra' }, valid)).toBe(true)
  })

  it('valida tipo y tamaño de la foto', () => {
    expect(avatarFileError({ type: 'image/png', size: 1000 })).toBeNull()
    expect(avatarFileError({ type: 'image/gif', size: 1000 })).toContain('JPG, PNG o WebP')
    expect(avatarFileError({ type: 'image/jpeg', size: 3 * 1024 * 1024 })).toContain('2 MB')
  })
})
