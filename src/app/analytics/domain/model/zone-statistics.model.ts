/** Período de las estadísticas (HU-21) y la unidad de cada punto que devuelve el backend. */
export type StatisticsPeriod = 'week' | 'month' | 'year'
export type StatisticsGranularity = 'day' | 'week' | 'month'

/** Un intervalo del período. Sin datos (`samples === 0`), los valores son `null`: el gráfico deja el hueco. */
export interface StatisticsPoint {
  start:        number
  end:          number
  avgPct:       number | null
  maxPct:       number | null
  avgOccupied:  number | null
  maxOccupied:  number | null
  totalSpots:   number | null
  samples:      number
}

export interface StatisticsSummary {
  avgPct:       number
  maxPct:       number
  /** Inicio del intervalo con mayor ocupación promedio. */
  busiestStart: number | null
  samples:      number
}

export interface ZoneStatistics {
  zoneId:      number
  zoneName:    string
  period:      StatisticsPeriod
  granularity: StatisticsGranularity
  from:        number
  to:          number
  points:      StatisticsPoint[]
  /** `null` = el rango no tiene ningún dato. */
  summary:     StatisticsSummary | null
}
