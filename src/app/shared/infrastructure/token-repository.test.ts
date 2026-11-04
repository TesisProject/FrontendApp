import { describe, expect, it } from 'vitest'
import { isExpired } from './token-repository'

/** JWT sin firma válida: el frontend solo decodifica el payload, no verifica la firma. */
function jwt(payload: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.firma`
}

describe('token-repository.isExpired (HU-05: authGuard valida exp)', () => {
  const now = Date.UTC(2026, 10, 4, 12, 0, 0)
  const nowSec = Math.floor(now / 1000)

  it('un token vigente no está vencido', () => {
    expect(isExpired(jwt({ exp: nowSec + 3600 }), now)).toBe(false)
  })

  it('un token con exp pasado está vencido', () => {
    expect(isExpired(jwt({ exp: nowSec - 1 }), now)).toBe(true)
  })

  it('el margen adelanta el vencimiento', () => {
    expect(isExpired(jwt({ exp: nowSec + 3 }), now, 5)).toBe(true)
  })

  it('un token ilegible o sin exp cuenta como vencido', () => {
    expect(isExpired('basura', now)).toBe(true)
    expect(isExpired(jwt({ sub: '1' }), now)).toBe(true)
  })
})
