import type { StatisticsGranularity, StatisticsPeriod } from './model/zone-statistics.model'

const TZ = 'America/Lima'

const dayFmt   = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', timeZone: TZ })
const weekFmt  = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: TZ })
const monthFmt = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: TZ })
const longFmt  = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
const monthLongFmt = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: TZ })

const clean = (s: string) => s.replace(/\./g, '')

/** Etiqueta del eje X de un intervalo, en hora de Lima: `lun 3`, `3 nov` o `nov 26`. */
export function bucketAxisLabel(start: number, granularity: StatisticsGranularity): string {
  if (granularity === 'day') return clean(dayFmt.format(start))
  if (granularity === 'week') return clean(weekFmt.format(start))
  return clean(monthFmt.format(start))
}

/** Etiqueta completa para el tooltip y la tabla: `3 de noviembre de 2026`, `Semana del 3 de …` o `noviembre de 2026`. */
export function bucketLongLabel(start: number, granularity: StatisticsGranularity): string {
  if (granularity === 'day') return longFmt.format(start)
  if (granularity === 'week') return `Semana del ${longFmt.format(start)}`
  return monthLongFmt.format(start)
}

export const PERIOD_LABEL: Record<StatisticsPeriod, string> = {
  week:  'Última semana (por día)',
  month: 'Último mes (por semana)',
  year:  'Último año (por mes)',
}

/** `42,5 %` con coma decimal; `—` si no hay dato. */
export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—'
  return `${value.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: digits })} %`
}
