import { describe, expect, it } from 'vitest'
import { createRecoverySession } from './recovery-session'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    map,
    getItem:    (k: string) => map.get(k) ?? null,
    setItem:    (k: string, v: string) => { map.set(k, v) },
    removeItem: (k: string) => { map.delete(k) },
  }
}

describe('recovery-session (HU-03: el código no viaja en la URL)', () => {
  it('guarda el correo y luego el código verificado', () => {
    const session = createRecoverySession(memoryStorage())
    session.start('ana@parkvision.pe')
    session.saveCode('12345')
    expect(session.get()).toEqual({ email: 'ana@parkvision.pe', code: '12345' })
  })

  it('empezar de nuevo descarta el código anterior', () => {
    const session = createRecoverySession(memoryStorage())
    session.start('ana@parkvision.pe')
    session.saveCode('12345')
    session.start('ana@parkvision.pe')
    expect(session.get()?.code).toBeUndefined()
  })

  it('clearCode conserva el correo para pedir otro código', () => {
    const session = createRecoverySession(memoryStorage())
    session.start('ana@parkvision.pe')
    session.saveCode('12345')
    session.clearCode()
    expect(session.get()).toEqual({ email: 'ana@parkvision.pe' })
  })

  it('devuelve null con datos corruptos', () => {
    const storage = memoryStorage()
    storage.setItem('pv_password_recovery', '{no-json')
    expect(createRecoverySession(storage).get()).toBeNull()
  })
})
