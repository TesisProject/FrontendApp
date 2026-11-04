import { describe, expect, it } from 'vitest'
import { toFavorite } from './favorite-assembler'

describe('favorite-assembler (HU-28)', () => {
  it('trae nombre y estado actual de la zona', () => {
    expect(toFavorite({
      userId: 3, zoneId: 7, savedAt: '2026-11-04T10:00:00',
      zoneName: 'Sótano A', classification: 'MODERADO', available: 4, total: 12,
    })).toEqual({
      userId: 3, zoneId: 7, savedAt: '2026-11-04T10:00:00',
      zoneName: 'Sótano A', classification: 'MODERADO', available: 4, total: 12,
    })
  })

  it('zona borrada o sin datos: campos en null', () => {
    const fav = toFavorite({ userId: 3, zoneId: 9, savedAt: 'x', zoneName: null, classification: 'SIN_DATOS' })
    expect(fav.zoneName).toBeNull()
    expect(fav.classification).toBeNull()
    expect(fav.available).toBeNull()
  })
})
