/** Franja de la demanda (HU-19): hora del día (0–23) o día de la semana ISO (1 = lunes … 7 = domingo). */
export type DemandGrouping = 'hour' | 'day'

/** `THRESHOLD`: promedio ≥ 80 %. `PERCENTILE`: en el 10 % más alto del resultado. */
export type PeakReason = 'THRESHOLD' | 'PERCENTILE'

export interface DemandSlot {
  slot:       number
  label:      string
  avgPct:     number
  maxPct:     number
  samples:    number
  peak:       boolean
  peakReason: PeakReason | null
}

export interface DemandZone {
  zoneId:      number
  zoneName:    string
  /** Tiene al menos una franja pico: se resalta en el panel. */
  peakZone:    boolean
  peakSlots:   number
  busiestSlot: DemandSlot
  slots:       DemandSlot[]
}

export interface DemandPeaks {
  groupBy:      DemandGrouping
  from:         number
  to:           number
  thresholdPct: number
  /** `null` = sin datos. */
  percentile90: number | null
  /** De mayor a menor demanda. */
  zones:        DemandZone[]
}
