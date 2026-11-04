import { UNKNOWN_TEXT } from '../../shared/helpers/text'
import type { IsoDayOfWeek, OpeningHoursEntry } from './model/opening-hours.model'

/** Días ISO en orden, de lunes a domingo. */
export const ISO_DAYS: readonly IsoDayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]

export const DAY_NAMES: Record<IsoDayOfWeek, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
}

/** Máximo de tramos que acepta el backend: uno por día más el de feriados. */
export const MAX_OPENING_HOURS_ENTRIES = 8

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isIsoDayOfWeek(value: unknown): value is IsoDayOfWeek {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
}

/** `"08:00:00"` o `"8:00"` → `"08:00"`; `null` si no es una hora válida. */
export function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim())
  if (!m) return null
  const time = `${m[1]!.padStart(2, '0')}:${m[2]}`
  return TIME_RE.test(time) ? time : null
}

// ── Validación (las mismas reglas que aplica el dominio del backend) ──────────────────────────

/** Error de un tramo suelto (horas), o `null` si es válido. */
export function openingHoursEntryError(e: Pick<OpeningHoursEntry, 'opensAt' | 'closesAt'>): string | null {
  if (!TIME_RE.test(e.opensAt) || !TIME_RE.test(e.closesAt)) return 'Indica la hora de inicio y de fin'
  if (e.opensAt >= e.closesAt) return 'La hora de inicio debe ser anterior a la de fin (para 24 h usa 00:00–23:59)'
  return null
}

/** Nombre de la fila de un tramo: el día o "Feriados". */
export function entryLabel(e: Pick<OpeningHoursEntry, 'dayOfWeek' | 'holiday'>): string {
  return e.holiday || e.dayOfWeek === null ? 'Feriados' : DAY_NAMES[e.dayOfWeek]
}

/** Primer error del horario completo, con el día al que pertenece, o `null` si es válido. */
export function openingHoursError(entries: readonly OpeningHoursEntry[]): string | null {
  if (entries.length > MAX_OPENING_HOURS_ENTRIES) return `El horario admite como máximo ${MAX_OPENING_HOURS_ENTRIES} tramos`
  const seen = new Set<number>()
  for (const e of entries) {
    if (e.holiday && e.dayOfWeek !== null) return 'El tramo de feriados no lleva día de la semana'
    if (!e.holiday && !isIsoDayOfWeek(e.dayOfWeek)) return 'Cada tramo debe indicar un día de lunes a domingo'
    const key = e.holiday ? 0 : e.dayOfWeek!
    if (seen.has(key)) return `${entryLabel(e)}: solo se admite un tramo`
    seen.add(key)
    const error = openingHoursEntryError(e)
    if (error) return `${entryLabel(e)}: ${error}`
  }
  return null
}

// ── Formato ───────────────────────────────────────────────────────────────────────────────────

interface Run {
  key:   string
  start: IsoDayOfWeek
  end:   IsoDayOfWeek
}

const runLength = (r: Run) => r.end - r.start + 1

function dayRangeLabel(start: IsoDayOfWeek, end: IsoDayOfWeek): string {
  return start === end ? DAY_NAMES[start] : `${DAY_NAMES[start]}–${DAY_NAMES[end]}`
}

/** "A", "A y B", "A, B y C". */
function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** Tramos consecutivos de días (lunes→domingo) que comparten la misma clave. */
function consecutiveRuns(keyOf: (day: IsoDayOfWeek) => string | null): Run[] {
  const runs: Run[] = []
  for (const day of ISO_DAYS) {
    const key = keyOf(day)
    if (key === null) continue
    const last = runs[runs.length - 1]
    if (last && last.key === key && last.end + 1 === day) last.end = day
    else runs.push({ key, start: day, end: day })
  }
  return runs
}

/**
 * Une `A · B · A` (contiguos) en un tramo `A` que abarca a `B`, y deja `B` como excepción listada
 * aparte: "Lunes–Viernes de 08:00 a 15:00, Miércoles de 10:00 a 18:00". Solo si `B` no se repite en
 * otro tramo y es más corto que los dos `A` juntos, para no producir lecturas confusas.
 */
function mergeExceptions(runs: Run[]): { main: Run[]; exceptions: Run[] } {
  const main = [...runs]
  const exceptions: Run[] = []
  let merged = true
  while (merged) {
    merged = false
    for (let i = 0; i + 2 < main.length; i++) {
      const [a, b, c] = [main[i]!, main[i + 1]!, main[i + 2]!]
      const contiguous = a.end + 1 === b.start && b.end + 1 === c.start
      const bIsUnique = main.filter((r) => r.key === b.key).length === 1
      if (a.key === c.key && contiguous && bIsUnique && runLength(b) < runLength(a) + runLength(c)) {
        main.splice(i, 3, { key: a.key, start: a.start, end: c.end })
        exceptions.push(b)
        merged = true
        break
      }
    }
  }
  return { main, exceptions }
}

/**
 * Horario en líneas legibles, en orden: los días abiertos agrupados ("Lunes–Viernes de 08:00 a 15:00"),
 * los cerrados ("Sábado y Domingo: cerrado") y los feriados ("Feriados de 09:00 a 13:00" o
 * "Feriados: sin información"). Sin tramos devuelve `["Sin información"]`.
 */
export function describeOpeningHours(entries: readonly OpeningHoursEntry[] | null | undefined): string[] {
  if (!entries || entries.length === 0) return [UNKNOWN_TEXT]

  const byDay = new Map<IsoDayOfWeek, OpeningHoursEntry>()
  let holiday: OpeningHoursEntry | undefined
  for (const e of entries) {
    if (e.holiday) holiday ??= e
    else if (isIsoDayOfWeek(e.dayOfWeek) && !byDay.has(e.dayOfWeek)) byDay.set(e.dayOfWeek, e)
  }

  const lines: string[] = []

  const openRuns = consecutiveRuns((day) => {
    const e = byDay.get(day)
    return e ? `${e.opensAt}|${e.closesAt}` : null
  })
  const { main, exceptions } = mergeExceptions(openRuns)
  const ordered = [...main, ...exceptions].sort((x, y) => x.start - y.start || runLength(y) - runLength(x))
  for (const run of ordered) {
    const [opensAt, closesAt] = run.key.split('|')
    lines.push(`${dayRangeLabel(run.start, run.end)} de ${opensAt} a ${closesAt}`)
  }

  const closedRuns = consecutiveRuns((day) => (byDay.has(day) ? null : 'closed'))
  if (closedRuns.length) {
    const labels = closedRuns.flatMap((r) =>
      runLength(r) >= 3
        ? [dayRangeLabel(r.start, r.end)]
        : ISO_DAYS.filter((d) => d >= r.start && d <= r.end).map((d) => DAY_NAMES[d]),
    )
    lines.push(`${joinEs(labels)}: cerrado`)
  }

  lines.push(holiday ? `Feriados de ${holiday.opensAt} a ${holiday.closesAt}` : 'Feriados: sin información')
  return lines
}

/** El horario en una sola línea (las líneas de `describeOpeningHours` separadas por comas). */
export function formatOpeningHours(entries: readonly OpeningHoursEntry[] | null | undefined): string {
  return describeOpeningHours(entries).join(', ')
}
