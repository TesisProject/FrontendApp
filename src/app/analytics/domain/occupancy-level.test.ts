import { describe, expect, it } from 'vitest'
import { hasLiveData, levelColor, levelLabel, NO_DATA_COLOR, weightedOccupancy } from './occupancy-level'

describe('hasLiveData / levelLabel / levelColor', () => {
  it('SIN_DATOS, vacío o desconocido = sin datos, en gris', () => {
    for (const c of ['SIN_DATOS', '', null, undefined, 'OTRA']) {
      expect(hasLiveData(c)).toBe(false)
      expect(levelLabel(c)).toBe('Sin datos')
      expect(levelColor(c)).toBe(NO_DATA_COLOR)
    }
  })

  it('las clasificaciones conocidas usan la paleta compartida', () => {
    expect(hasLiveData('OCUPADO')).toBe(true)
    expect(levelLabel('LIBRE')).toBe('Libre')
    expect(levelColor('OCUPADO')).toBe('#e53e3e')
  })
})

describe('weightedOccupancy', () => {
  it('pondera por capacidad en vez de promediar porcentajes', () => {
    // Promedio simple: (100 % + 0 %) / 2 = 50 %. Ponderado: 10 / 100 = 10 %.
    expect(weightedOccupancy([
      { occupied: 10, capacity: 10, classification: 'OCUPADO' },
      { occupied: 0,  capacity: 90, classification: 'LIBRE' },
    ])).toBeCloseTo(10)
  })

  it('ignora las zonas sin datos', () => {
    expect(weightedOccupancy([
      { occupied: 5, capacity: 10, classification: 'MODERADO' },
      { occupied: 0, capacity: 500, classification: 'SIN_DATOS' },
    ])).toBeCloseTo(50)
  })

  it('null si ninguna zona tiene datos', () => {
    expect(weightedOccupancy([{ occupied: 0, capacity: 10, classification: 'SIN_DATOS' }])).toBeNull()
    expect(weightedOccupancy([])).toBeNull()
  })
})
