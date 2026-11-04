import type { IsoDayOfWeek, OpeningHoursEntry } from '../../parking/domain/model/opening-hours.model'

/** Lo que se usa de `google.maps.places.OpeningHoursPeriod` (`day`: 0 = domingo … 6 = sábado). */
interface GooglePoint { day: number; hour: number; minute: number }
interface GooglePeriod { open: GooglePoint; close: GooglePoint | null }

const pad = (n: number) => String(n).padStart(2, '0')
const toTime = (p: GooglePoint) => `${pad(p.hour)}:${pad(p.minute)}`
/** Google numera 0 = domingo; ISO 7 = domingo. */
const toIsoDay = (googleDay: number) => (googleDay === 0 ? 7 : googleDay) as IsoDayOfWeek

/**
 * Convierte `regularOpeningHours.periods` de Google al horario de la zona, para prellenar el editor:
 * - un solo periodo sin `close` = abierto siempre → los 7 días de 00:00 a 23:59;
 * - un periodo que cruza la medianoche se corta a las 23:59 del día en que abre;
 * - varios periodos el mismo día → del primer inicio al último cierre.
 * Google no informa los feriados: ese tramo queda vacío.
 */
export function fromGooglePeriods(periods: readonly GooglePeriod[] | null | undefined): OpeningHoursEntry[] {
  if (!periods?.length) return []
  if (periods.length === 1 && !periods[0]!.close) {
    return ([1, 2, 3, 4, 5, 6, 7] as IsoDayOfWeek[]).map((d) => ({ dayOfWeek: d, holiday: false, opensAt: '00:00', closesAt: '23:59' }))
  }
  const byDay = new Map<IsoDayOfWeek, { opensAt: string; closesAt: string }>()
  for (const { open, close } of periods) {
    if (!open || open.day < 0 || open.day > 6) continue
    const day = toIsoDay(open.day)
    const opensAt = toTime(open)
    const closesAt = !close || close.day !== open.day ? '23:59' : toTime(close)
    if (opensAt >= closesAt) continue
    const prev = byDay.get(day)
    byDay.set(day, prev
      ? { opensAt: prev.opensAt < opensAt ? prev.opensAt : opensAt, closesAt: prev.closesAt > closesAt ? prev.closesAt : closesAt }
      : { opensAt, closesAt })
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayOfWeek, t]) => ({ dayOfWeek, holiday: false, ...t }))
}
