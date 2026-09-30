import type { HistoryBucketQuery, HistoryBucketSize } from '../infrastructure/availability-api'
import type { ZoneOccupancyHistoryBucketResponse } from '../infrastructure/availability-response'

/**
 * Las cámaras mandan un frame cada ~5 min: pintarlos todos amontona puntos ilegibles. El backend
 * resume el historial en intervalos fijos (promedio, mínimo y máximo de ocupados) según el periodo.
 */
export type HistoryRange = '12h' | 'today' | '7d'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

interface RangeConfig {
  label:  string
  /** Tamaño de intervalo que se le pide al backend. */
  bucket: HistoryBucketSize
  /** Separación de las marcas del eje X en ms. */
  tick:   number
  /** Inicio del rango para un "ahora" dado. */
  from:   (now: number) => number
  /** Fin del eje; por defecto "ahora". "Hoy" muestra el día completo para que su forma sea estable. */
  to?:    (now: number) => number
}

export const HISTORY_RANGES: Record<HistoryRange, RangeConfig> = {
  '12h': { label: 'Últimas 12 h', bucket: '15m', tick: 2 * HOUR, from: now => now - 12 * HOUR },
  today: {
    label: 'Hoy', bucket: '30m', tick: 3 * HOUR,
    from: now => startOfLocalDay(now),
    to:   now => startOfLocalDay(now) + DAY,
  },
  '7d':  { label: 'Últimos 7 días', bucket: '3h', tick: DAY, from: now => startOfLocalDay(now) - 6 * DAY },
}

export const HISTORY_RANGE_OPTIONS = (Object.keys(HISTORY_RANGES) as HistoryRange[])
  .map(value => ({ value, label: HISTORY_RANGES[value].label }))

const BUCKET_MS: Record<HistoryBucketSize, number> = { '15m': 15 * MIN, '30m': 30 * MIN, '3h': 3 * HOUR }

/** "cada 15 min" / "cada 3 h", para explicar el gráfico. */
export function bucketLabel(range: HistoryRange): string {
  const minutes = BUCKET_MS[HISTORY_RANGES[range].bucket] / MIN
  return minutes >= 60 ? `${minutes / 60} h` : `${minutes} min`
}

/** Lo que se le pide al backend: siempre hasta "ahora" (el futuro de "Hoy" no tiene datos). */
export function historyQuery(range: HistoryRange, now: number): HistoryBucketQuery {
  const cfg = HISTORY_RANGES[range]
  return {
    bucket: cfg.bucket,
    from:   new Date(cfg.from(now)).toISOString(),
    to:     new Date(now).toISOString(),
  }
}

export interface HistoryBucket {
  start:    number
  end:      number
  avg:      number
  min:      number
  max:      number
  capacity: number
}

export interface HistorySeries {
  from:     number
  to:       number
  /** Momento de la consulta: ningún intervalo se dibuja más allá. */
  now:      number
  capacity: number
  /** Solo los intervalos con frames: un hueco significa que las cámaras no reportaron. */
  buckets:  HistoryBucket[]
  /** Separación de intervalos, para saber cuándo dos intervalos son contiguos. */
  bucketMs: number
  ticks:    number[]
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Inicio del periodo de `size` que contiene `ts`, alineado a la hora local (00:00, 03:00, 06:00…). */
function alignLocal(ts: number, size: number): number {
  const offset = new Date(ts).getTimezoneOffset() * MIN
  return Math.floor((ts - offset) / size) * size + offset
}

/** Serie del gráfico a partir de los intervalos del backend y del "ahora" con que se pidieron. */
export function buildHistorySeries(
  response: ZoneOccupancyHistoryBucketResponse[],
  range: HistoryRange,
  now: number,
): HistorySeries {
  const cfg = HISTORY_RANGES[range]
  const from = cfg.from(now)
  const to = cfg.to?.(now) ?? now

  const buckets = response.map(b => ({
    start:    new Date(b.bucketStart).getTime(),
    end:      new Date(b.bucketEnd).getTime(),
    avg:      b.avgOccupied,
    min:      b.minOccupied,
    max:      b.maxOccupied,
    capacity: b.totalSpots,
  }))

  const ticks: number[] = []
  for (let t = alignLocal(from, cfg.tick); t < to; t += cfg.tick) {
    if (t >= from) ticks.push(t)
  }

  return {
    from,
    to,
    now,
    capacity: Math.max(1, ...buckets.map(b => b.capacity)),
    buckets,
    bucketMs: BUCKET_MS[cfg.bucket],
    ticks,
  }
}
