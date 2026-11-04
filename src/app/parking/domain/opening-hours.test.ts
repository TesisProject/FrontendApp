import { describe, expect, it } from 'vitest'
import {
  describeOpeningHours, formatOpeningHours, fromOpeningHoursRanges, holidayTimes, openingHoursError, toOpeningHoursRanges,
} from './opening-hours'
import type { IsoDayOfWeek, OpeningHoursEntry } from './model/opening-hours.model'

const day = (dayOfWeek: IsoDayOfWeek, opensAt: string, closesAt: string): OpeningHoursEntry =>
  ({ dayOfWeek, holiday: false, opensAt, closesAt })
const holiday = (opensAt: string, closesAt: string): OpeningHoursEntry =>
  ({ dayOfWeek: null, holiday: true, opensAt, closesAt })
const weekdays = (opensAt: string, closesAt: string) =>
  ([1, 2, 3, 4, 5] as IsoDayOfWeek[]).map((d) => day(d, opensAt, closesAt))

describe('formatOpeningHours', () => {
  it('sin tramos devuelve "Sin información"', () => {
    expect(formatOpeningHours([])).toBe('Sin información')
    expect(formatOpeningHours(null)).toBe('Sin información')
  })

  it('agrupa días consecutivos con el mismo tramo y lista la excepción aparte', () => {
    const entries = [...weekdays('08:00', '15:00').filter((e) => e.dayOfWeek !== 3), day(3, '10:00', '18:00'), holiday('09:00', '13:00')]
    expect(formatOpeningHours(entries)).toBe(
      'Lunes–Viernes de 08:00 a 15:00, Miércoles de 10:00 a 18:00, Sábado y Domingo: cerrado, Feriados de 09:00 a 13:00',
    )
  })

  it('dos días seguidos usan rango y los cerrados se agrupan', () => {
    expect(describeOpeningHours([day(1, '08:00', '15:00'), day(2, '08:00', '15:00')])).toEqual([
      'Lunes–Martes de 08:00 a 15:00',
      'Miércoles–Domingo: cerrado',
      'Feriados: sin información',
    ])
  })

  it('un día cerrado en medio corta el grupo', () => {
    const entries = weekdays('08:00', '15:00').filter((e) => e.dayOfWeek !== 2)
    expect(formatOpeningHours(entries)).toBe(
      'Lunes de 08:00 a 15:00, Miércoles–Viernes de 08:00 a 15:00, Martes, Sábado y Domingo: cerrado, Feriados: sin información',
    )
  })

  it('no fusiona tramos alternados (sería confuso)', () => {
    const entries = [day(1, '08:00', '12:00'), day(2, '09:00', '12:00'), day(3, '08:00', '12:00'), day(4, '09:00', '12:00')]
    expect(describeOpeningHours(entries).slice(0, 4)).toEqual([
      'Lunes de 08:00 a 12:00', 'Martes de 09:00 a 12:00', 'Miércoles de 08:00 a 12:00', 'Jueves de 09:00 a 12:00',
    ])
  })

  it('toda la semana y solo feriados', () => {
    const all = ([1, 2, 3, 4, 5, 6, 7] as IsoDayOfWeek[]).map((d) => day(d, '00:00', '23:59'))
    expect(formatOpeningHours(all)).toBe('Lunes–Domingo de 00:00 a 23:59, Feriados: sin información')
    expect(formatOpeningHours([holiday('09:00', '13:00')])).toBe('Lunes–Domingo: cerrado, Feriados de 09:00 a 13:00')
  })
})

describe('openingHoursError', () => {
  it('acepta un horario válido', () => {
    expect(openingHoursError([...weekdays('08:00', '15:00'), holiday('09:00', '13:00')])).toBeNull()
  })

  it('rechaza inicio >= fin, días duplicados y dos tramos de feriados', () => {
    expect(openingHoursError([day(1, '15:00', '08:00')])).toMatch(/^Lunes: La hora de inicio/)
    expect(openingHoursError([day(1, '08:00', '08:00')])).toMatch(/^Lunes:/)
    expect(openingHoursError([day(2, '08:00', '09:00'), day(2, '10:00', '11:00')])).toBe('Martes: solo se admite un tramo')
    expect(openingHoursError([holiday('08:00', '09:00'), holiday('10:00', '11:00')])).toBe('Feriados: solo se admite un tramo')
  })

  it('aplica las reglas de holiday/dayOfWeek', () => {
    expect(openingHoursError([{ dayOfWeek: 1, holiday: true, opensAt: '08:00', closesAt: '09:00' }])).not.toBeNull()
    expect(openingHoursError([{ dayOfWeek: null, holiday: false, opensAt: '08:00', closesAt: '09:00' }])).not.toBeNull()
  })
})

describe('rangos de edición', () => {
  it('agrupa por horario los días, ordenados por su primer día, sin incluir feriados', () => {
    const entries = [day(6, '10:00', '14:00'), ...weekdays('09:00', '18:00'), holiday('09:00', '13:00')]
    expect(toOpeningHoursRanges(entries)).toEqual([
      { opensAt: '09:00', closesAt: '18:00', days: [1, 2, 3, 4, 5] },
      { opensAt: '10:00', closesAt: '14:00', days: [6] },
    ])
    expect(holidayTimes(entries)).toEqual({ opensAt: '09:00', closesAt: '13:00' })
    expect(holidayTimes(weekdays('09:00', '18:00'))).toBeNull()
  })

  it('vuelve a tramos por día en orden canónico, con feriados al final', () => {
    const entries = fromOpeningHoursRanges(
      [{ opensAt: '10:00', closesAt: '14:00', days: [6] }, { opensAt: '09:00', closesAt: '18:00', days: [5, 1] }],
      { opensAt: '09:00', closesAt: '13:00' },
    )
    expect(entries).toEqual([day(1, '09:00', '18:00'), day(5, '09:00', '18:00'), day(6, '10:00', '14:00'), holiday('09:00', '13:00')])
  })

  it('un día repetido en dos rangos se queda con el primero', () => {
    const entries = fromOpeningHoursRanges(
      [{ opensAt: '08:00', closesAt: '12:00', days: [1] }, { opensAt: '14:00', closesAt: '18:00', days: [1, 2] }],
      null,
    )
    expect(entries).toEqual([day(1, '08:00', '12:00'), day(2, '14:00', '18:00')])
    expect(openingHoursError(entries)).toBeNull()
  })

  it('ida y vuelta conserva el horario', () => {
    const entries = [...weekdays('08:00', '15:00'), day(6, '09:00', '13:00'), holiday('10:00', '12:00')]
    expect(fromOpeningHoursRanges(toOpeningHoursRanges(entries), holidayTimes(entries))).toEqual(entries)
  })
})
