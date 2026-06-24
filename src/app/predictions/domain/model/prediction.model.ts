export type DayOfWeek =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
  | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface OccupancyForecast {
  id: number
  parkingSpotId: number
  dayOfWeek: DayOfWeek
  startMinuteOfDay: number
  windowSizeMinutes: number
  availabilityProbability: number
  modelVersion: string
  createdAt: string
  updatedAt: string
}

/** Lado predicho por la IA para la ventana vigente de una zona. */
export interface PredictedSide {
  availabilityProbability: number
  totalSpots: number
  availableSpots: number
  occupiedSpots: number
  modelVersion: string
}

/** Lado real medido por las cámaras / módulo de ocupación. */
export interface ActualSide {
  totalSpots: number
  availableSpots: number
  occupiedSpots: number
  occurredAt: string
}

/** Diferencia predicho − real (qué tan acertada estuvo la IA). */
export interface ComparisonDelta {
  availableDiff: number
  occupiedDiff: number
}

/**
 * Comparativa "lo que predijo la IA" vs "lo que detectaron las cámaras" para la ventana de tiempo
 * vigente de una zona. `actual` y `delta` son `null` cuando aún no hay lectura de ocupación real.
 */
export interface ZoneForecastComparison {
  zoneId: number
  dayOfWeek: DayOfWeek
  startMinuteOfDay: number
  windowSizeMinutes: number
  predicted: PredictedSide
  actual: ActualSide | null
  delta: ComparisonDelta | null
}
