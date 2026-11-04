import { describe, expect, it } from 'vitest'
import { demandMatrix, heatOpacity, slotAxis, slotShortLabel } from './demand-matrix'
import type { DemandPeaks, DemandSlot } from './model/demand-peaks.model'

const slot = (n: number, avgPct: number, peak = false): DemandSlot => ({
  slot: n, label: String(n), avgPct, maxPct: avgPct, samples: 10, peak, peakReason: peak ? 'THRESHOLD' : null,
})

describe('slotAxis / slotShortLabel', () => {
  it('24 horas o 7 días ISO', () => {
    expect(slotAxis('hour')).toHaveLength(24)
    expect(slotAxis('day')).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(slotShortLabel('hour', 7)).toBe('07h')
    expect(slotShortLabel('day', 1)).toBe('Lun')
    expect(slotShortLabel('day', 7)).toBe('Dom')
  })
})

describe('demandMatrix', () => {
  it('una celda por franja del eje, con null donde la zona no tuvo lecturas', () => {
    const peaks: DemandPeaks = {
      groupBy: 'day', from: 0, to: 1, thresholdPct: 80, percentile90: 85,
      zones: [{ zoneId: 1, zoneName: 'Centro', peakZone: true, peakSlots: 1, busiestSlot: slot(5, 85, true), slots: [slot(1, 20), slot(5, 85, true)] }],
    }
    const [row] = demandMatrix(peaks)
    expect(row.cells).toHaveLength(7)
    expect(row.cells[0]?.avgPct).toBe(20)
    expect(row.cells[1]).toBeNull()
    expect(row.cells[4]?.peak).toBe(true)
    expect(row.peakZone).toBe(true)
  })
})

describe('heatOpacity', () => {
  it('crece con la ocupación y se acota a 0–100 %', () => {
    expect(heatOpacity(0)).toBeCloseTo(0.08)
    expect(heatOpacity(100)).toBeCloseTo(0.85)
    expect(heatOpacity(150)).toBeCloseTo(0.85)
    expect(heatOpacity(50)).toBeGreaterThan(heatOpacity(20))
  })
})
