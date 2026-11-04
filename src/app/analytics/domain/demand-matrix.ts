import type { DemandGrouping, DemandPeaks, DemandSlot } from './model/demand-peaks.model'

const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Todas las franjas del eje: 0–23 por hora, 1–7 por día. */
export function slotAxis(groupBy: DemandGrouping): number[] {
  return groupBy === 'hour'
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 7 }, (_, i) => i + 1)
}

/** Etiqueta corta de la cabecera de columna: `18h` o `Lun`. */
export function slotShortLabel(groupBy: DemandGrouping, slot: number): string {
  return groupBy === 'hour' ? `${String(slot).padStart(2, '0')}h` : DAY_SHORT[slot - 1] ?? String(slot)
}

export interface DemandRow {
  zoneId:   number
  zoneName: string
  peakZone: boolean
  /** Una celda por franja del eje; `null` = sin datos en esa franja. */
  cells:    (DemandSlot | null)[]
}

/** Matriz zona × franja para el mapa de calor, con huecos donde la zona no tuvo lecturas. */
export function demandMatrix(peaks: DemandPeaks): DemandRow[] {
  const axis = slotAxis(peaks.groupBy)
  return peaks.zones.map(z => {
    const bySlot = new Map(z.slots.map(s => [s.slot, s]))
    return {
      zoneId:   z.zoneId,
      zoneName: z.zoneName,
      peakZone: z.peakZone,
      cells:    axis.map(slot => bySlot.get(slot) ?? null),
    }
  })
}

/**
 * Fondo de una celda: más opaco cuanto mayor la ocupación. Las celdas pico se pintan aparte (rojo).
 * Devuelve la opacidad 0.08–0.85 para usar con el color de la marca.
 */
export function heatOpacity(avgPct: number): number {
  const clamped = Math.min(Math.max(avgPct, 0), 100)
  return 0.08 + (clamped / 100) * 0.77
}
