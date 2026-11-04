import { describe, expect, it } from 'vitest'
import { fromGooglePeriods } from './google-opening-hours'

const p = (day: number, h1: number, m1: number, closeDay: number | null, h2 = 0, m2 = 0) => ({
  open:  { day, hour: h1, minute: m1 },
  close: closeDay === null ? null : { day: closeDay, hour: h2, minute: m2 },
})

describe('fromGooglePeriods', () => {
  it('sin periodos devuelve []', () => {
    expect(fromGooglePeriods(undefined)).toEqual([])
  })

  it('abierto siempre (un periodo sin cierre) = 7 días de 00:00 a 23:59', () => {
    const entries = fromGooglePeriods([p(0, 0, 0, null)])
    expect(entries).toHaveLength(7)
    expect(entries.every((e) => e.opensAt === '00:00' && e.closesAt === '23:59' && !e.holiday)).toBe(true)
  })

  it('convierte el domingo de Google (0) a ISO 7 y une varios tramos del mismo día', () => {
    expect(fromGooglePeriods([p(1, 8, 0, 1, 12, 0), p(1, 14, 0, 1, 20, 30), p(0, 9, 0, 0, 13, 0)])).toEqual([
      { dayOfWeek: 1, holiday: false, opensAt: '08:00', closesAt: '20:30' },
      { dayOfWeek: 7, holiday: false, opensAt: '09:00', closesAt: '13:00' },
    ])
  })

  it('un periodo que cruza la medianoche se corta a las 23:59', () => {
    expect(fromGooglePeriods([p(5, 22, 0, 6, 2, 0)])).toEqual([
      { dayOfWeek: 5, holiday: false, opensAt: '22:00', closesAt: '23:59' },
    ])
  })
})
