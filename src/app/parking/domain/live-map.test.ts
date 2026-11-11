import { describe, expect, it } from 'vitest'
import { DEFAULT_RADIUS_KM, formatRadius, widerRadius, withinRadius } from './geo'
import { formatUpdatedClock, staleNotice } from './availability-freshness'
import { googleMapsDirectionsUrl, hasValidCoords, wazeUrl } from './navigation-links'
import { CLASSIFICATION_COLOR, classificationLabel, toClassification } from './zone-classification'
import { toZone } from '../infrastructure/zone-assembler'
import type { ZoneResponse } from '../infrastructure/zone-response'

// Plaza San Martín (Lima).
const USER = { lat: -12.0516, lng: -77.0347 }

describe('withinRadius (HU-07/HU-10)', () => {
  const zones = [
    { id: 1, latitude: -12.0416, longitude: -77.0347 }, // ~1,1 km al norte
    { id: 2, latitude: -12.0453, longitude: -77.0311 }, // ~0,8 km (Plaza Mayor)
    { id: 3, latitude: -12.19, longitude: -77.03 },     // ~15 km
    { id: 4, latitude: 0, longitude: 0 },               // sin ubicar
  ]

  it('deja solo las zonas dentro del radio, de la más cercana a la más lejana', () => {
    expect([...withinRadius(zones, USER, 2).keys()]).toEqual([2, 1])
  })

  it('devuelve vacío cuando no hay zonas en el radio', () => {
    expect(withinRadius(zones, USER, 0.5).size).toBe(0)
  })

  it('ignora las zonas sin coordenadas', () => {
    expect(withinRadius(zones, USER, 50).has(4)).toBe(false)
  })
})

describe('radios del filtro', () => {
  it('sugiere el siguiente radio más amplio para "ampliar"', () => {
    expect(widerRadius(0.5)).toBe(1)
    expect(widerRadius(DEFAULT_RADIUS_KM)).toBe(5)
    expect(widerRadius(5)).toBeNull()
  })

  it('formatea metros y kilómetros', () => {
    expect(formatRadius(0.5)).toBe('500 m')
    expect(formatRadius(2)).toBe('2 km')
  })
})

describe('staleNotice (HU-08)', () => {
  it('no avisa si los datos están al día', () => {
    expect(staleNotice({ stale: false, lastUpdatedAt: '2026-11-04T15:00:00Z' })).toBeNull()
  })

  it('muestra "Datos no actualizados · HH:mm" con la hora de la última lectura', () => {
    const iso = '2026-11-04T15:07:00Z'
    expect(staleNotice({ stale: true, lastUpdatedAt: iso })).toBe(`Datos no actualizados · ${formatUpdatedClock(iso)}`)
    expect(formatUpdatedClock(iso)).toMatch(/^\d{2}:\d{2}$/)
  })

  it('avisa sin hora si nunca hubo lectura', () => {
    expect(staleNotice({ stale: true, lastUpdatedAt: null })).toBe('Datos no actualizados')
  })
})

describe('enlaces de navegación (HU-29)', () => {
  const dest = { lat: -12.0453, lng: -77.0311 }

  it('arma el deep link de Waze con navegación', () => {
    expect(wazeUrl(dest)).toBe('https://waze.com/ul?ll=-12.0453,-77.0311&navigate=yes')
  })

  it('arma la ruta de Google Maps desde la ubicación del usuario', () => {
    const url = new URL(googleMapsDirectionsUrl(dest, USER))
    expect(url.searchParams.get('destination')).toBe('-12.0453,-77.0311')
    expect(url.searchParams.get('origin')).toBe('-12.0516,-77.0347')
    expect(url.searchParams.get('travelmode')).toBe('driving')
  })

  it('rechaza coordenadas ausentes, 0,0 o fuera de rango', () => {
    expect(hasValidCoords(null, -77)).toBe(false)
    expect(hasValidCoords(0, 0)).toBe(false)
    expect(hasValidCoords(-95, -77)).toBe(false)
    expect(hasValidCoords(-12.04, -77.03)).toBe(true)
  })
})

describe('clasificación (HU-12)', () => {
  it('usa amarillo para moderado y gris para sin datos', () => {
    expect(CLASSIFICATION_COLOR.MODERADO).toBe('#d69e2e')
    expect(CLASSIFICATION_COLOR.SIN_DATOS).toBe('#a0aec0')
    expect(classificationLabel('SIN_DATOS')).toBe('Sin datos')
  })

  it('trata un valor desconocido o ausente como sin datos', () => {
    expect(toClassification('OCUPADO')).toBe('OCUPADO')
    expect(toClassification(undefined)).toBe('SIN_DATOS')
    expect(toClassification('RARO')).toBe('SIN_DATOS')
  })

  it('una zona sin disponibilidad se muestra sin datos, no libre', () => {
    const response = {
      id: 7, name: 'Zona', street: 'Calle', district: 'Cercado', city: 'Lima', latitude: -12, longitude: -77,
      totalSpaces: 10, totalCapacity: 10, openingHours: [], googlePlaceId: null, photos: [], active: true,
    } as unknown as ZoneResponse
    expect(toZone(response).classification).toBe('SIN_DATOS')
    const stale = toZone(response, {
      zoneId: 7, total: 10, occupied: 9, available: 1, occupancyPercentage: 90, classification: 'OCUPADO',
      lastUpdatedAt: '2026-11-04T15:00:00Z', stale: true, spaces: [],
    })
    expect(stale).toMatchObject({ classification: 'OCUPADO', stale: true, lastUpdatedAt: '2026-11-04T15:00:00Z' })
  })
})
