import { httpClient } from '../../shared/infrastructure/http-client'
import type { StatisticsPeriod } from '../domain/model/zone-statistics.model'
import type { DemandGrouping } from '../domain/model/demand-peaks.model'
import type { DemandPeaksResponse, ZoneStatisticsResponse } from './analytics-response'
import { downloadCsv } from './csv-download'

export interface PeaksQuery {
  groupBy: DemandGrouping
  /** Instantes ISO-8601. */
  from?:   string
  to?:     string
  zoneId?: number
}

function peaksParams(q: PeaksQuery): Record<string, string | number | undefined> {
  return { groupBy: q.groupBy, from: q.from, to: q.to, zoneId: q.zoneId }
}

function toSearch(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') search.set(k, String(v)) })
  return search.toString()
}

/** Analítica del panel admin — `/occupancy/**` (solo ADMIN). */
export class AnalyticsApi {
  getZoneStatistics(zoneId: number, period: StatisticsPeriod): Promise<ZoneStatisticsResponse> {
    return httpClient.get(`/occupancy/zones/${zoneId}/statistics?${toSearch({ period })}`)
  }

  getPeaks(q: PeaksQuery): Promise<DemandPeaksResponse> {
    return httpClient.get(`/occupancy/analytics/peaks?${toSearch(peaksParams(q))}`)
  }

  exportPeaksCsv(q: PeaksQuery): Promise<void> {
    return downloadCsv('/occupancy/analytics/peaks/export.csv', peaksParams(q), `picos-demanda-${q.groupBy}.csv`)
  }

  exportAvailabilityCsv(): Promise<void> {
    return downloadCsv('/occupancy/zones/availability/export.csv', {}, 'ocupacion-por-zona.csv')
  }
}

export const analyticsApi = new AnalyticsApi()
