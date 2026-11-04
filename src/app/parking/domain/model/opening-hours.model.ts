/** Día de la semana ISO-8601: 1 = lunes … 7 = domingo. */
export type IsoDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * Tramo de atención de una zona. Un tramo por día de la semana (`holiday = false`, `dayOfWeek` 1–7)
 * y, como mucho, uno para los feriados (`holiday = true`, `dayOfWeek = null`). Horas `HH:mm`, con
 * `opensAt < closesAt` (no cruza la medianoche; 24 h = 00:00–23:59).
 */
export interface OpeningHoursEntry {
  dayOfWeek: IsoDayOfWeek | null
  holiday:   boolean
  opensAt:   string
  closesAt:  string
}
