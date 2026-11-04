import { describe, expect, it } from 'vitest'
import { toDemandPeaks, toZoneStatistics } from './analytics-assembler'
import { filenameFromDisposition } from './csv-download'

describe('toZoneStatistics', () => {
  it('convierte instantes a ms y conserva los huecos sin datos', () => {
    const s = toZoneStatistics({
      zoneId: 1, zoneName: 'Centro', period: 'week', granularity: 'day',
      from: '2026-10-29T05:00:00Z', to: '2026-11-04T15:00:00Z',
      points: [
        { bucketStart: '2026-10-29T05:00:00Z', bucketEnd: '2026-10-30T05:00:00Z', avgOccupancyPercentage: 40, maxOccupancyPercentage: 75, avgOccupied: 4.8, maxOccupied: 9, totalSpots: 12, samples: 100 },
        { bucketStart: '2026-10-30T05:00:00Z', bucketEnd: '2026-10-31T05:00:00Z', avgOccupancyPercentage: null, maxOccupancyPercentage: null, avgOccupied: null, maxOccupied: null, totalSpots: null, samples: 0 },
      ],
      summary: { avgOccupancyPercentage: 40, maxOccupancyPercentage: 75, busiestBucketStart: '2026-10-29T05:00:00Z', samples: 100 },
    })
    expect(s.from).toBe(Date.parse('2026-10-29T05:00:00Z'))
    expect(s.points[1].avgPct).toBeNull()
    expect(s.summary?.busiestStart).toBe(Date.parse('2026-10-29T05:00:00Z'))
  })

  it('summary null cuando el período no tiene datos', () => {
    const s = toZoneStatistics({
      zoneId: 1, zoneName: 'Centro', period: 'year', granularity: 'month',
      from: '2025-12-01T05:00:00Z', to: '2026-11-04T15:00:00Z', points: [], summary: null,
    })
    expect(s.summary).toBeNull()
  })
})

describe('toDemandPeaks', () => {
  it('mapea franjas y motivo del pico', () => {
    const slot = { slot: 18, label: '18:00–19:00', avgOccupancyPercentage: 85, maxOccupancyPercentage: 100, samples: 40, peak: true, peakReason: 'THRESHOLD' }
    const p = toDemandPeaks({
      groupBy: 'hour', from: '2026-10-05T00:00:00Z', to: '2026-11-04T00:00:00Z', thresholdPercentage: 80, percentile90: 85,
      zones: [{ zoneId: 1, zoneName: 'Centro', peakZone: true, peakSlots: 1, busiestSlot: slot, slots: [slot] }],
    })
    expect(p.zones[0].busiestSlot.avgPct).toBe(85)
    expect(p.zones[0].slots[0].peakReason).toBe('THRESHOLD')
  })
})

describe('filenameFromDisposition', () => {
  it('lee filename simple, filename* codificado o usa el respaldo', () => {
    expect(filenameFromDisposition('attachment; filename="picos-demanda-hour.csv"', 'x.csv')).toBe('picos-demanda-hour.csv')
    expect(filenameFromDisposition("attachment; filename*=UTF-8''ocupaci%C3%B3n.csv", 'x.csv')).toBe('ocupación.csv')
    expect(filenameFromDisposition(undefined, 'x.csv')).toBe('x.csv')
  })
})
