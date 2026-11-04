import type {
  StatisticsGranularity, StatisticsPeriod, ZoneStatistics,
} from '../domain/model/zone-statistics.model'
import type { DemandGrouping, DemandPeaks, DemandSlot, PeakReason } from '../domain/model/demand-peaks.model'
import type { DemandPeaksResponse, DemandSlotResponse, ZoneStatisticsResponse } from './analytics-response'

const ts = (iso: string) => new Date(iso).getTime()

export function toZoneStatistics(r: ZoneStatisticsResponse): ZoneStatistics {
  return {
    zoneId:      r.zoneId,
    zoneName:    r.zoneName,
    period:      r.period as StatisticsPeriod,
    granularity: r.granularity as StatisticsGranularity,
    from:        ts(r.from),
    to:          ts(r.to),
    points:      r.points.map(p => ({
      start:       ts(p.bucketStart),
      end:         ts(p.bucketEnd),
      avgPct:      p.avgOccupancyPercentage,
      maxPct:      p.maxOccupancyPercentage,
      avgOccupied: p.avgOccupied,
      maxOccupied: p.maxOccupied,
      totalSpots:  p.totalSpots,
      samples:     p.samples,
    })),
    summary: r.summary && r.summary.samples > 0
      ? {
          avgPct:       r.summary.avgOccupancyPercentage,
          maxPct:       r.summary.maxOccupancyPercentage,
          busiestStart: r.summary.busiestBucketStart ? ts(r.summary.busiestBucketStart) : null,
          samples:      r.summary.samples,
        }
      : null,
  }
}

function toSlot(s: DemandSlotResponse): DemandSlot {
  return {
    slot:       s.slot,
    label:      s.label,
    avgPct:     s.avgOccupancyPercentage,
    maxPct:     s.maxOccupancyPercentage,
    samples:    s.samples,
    peak:       s.peak,
    peakReason: (s.peakReason as PeakReason | null) ?? null,
  }
}

export function toDemandPeaks(r: DemandPeaksResponse): DemandPeaks {
  return {
    groupBy:      r.groupBy as DemandGrouping,
    from:         ts(r.from),
    to:           ts(r.to),
    thresholdPct: r.thresholdPercentage,
    percentile90: r.percentile90,
    zones:        r.zones.map(z => ({
      zoneId:      z.zoneId,
      zoneName:    z.zoneName,
      peakZone:    z.peakZone,
      peakSlots:   z.peakSlots,
      busiestSlot: toSlot(z.busiestSlot),
      slots:       z.slots.map(toSlot),
    })),
  }
}
