import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StatisticsPeriod, ZoneStatistics } from '../domain/model/zone-statistics.model'
import { analyticsApi } from '../infrastructure/analytics-api'
import { toZoneStatistics } from '../infrastructure/analytics-assembler'
import { analyticsErrorMessage } from './analytics-error-messages'

/** Estadísticas de ocupación de una zona por semana, mes o año (HU-21). */
export const useZoneStatisticsStore = defineStore('zone-statistics', () => {
  const statistics = ref<ZoneStatistics | null>(null)
  const loading    = ref(false)
  const error      = ref<string | null>(null)
  /** Lo que tardó la última carga, para comprobar el "menos de 3 segundos" de la HU. */
  const elapsedMs  = ref<number | null>(null)

  // Si el filtro cambia antes de que llegue la respuesta anterior, esa respuesta se descarta.
  let requestId = 0

  async function fetchStatistics(zoneId: number, period: StatisticsPeriod) {
    const id = ++requestId
    loading.value = true
    error.value   = null
    const started = performance.now()
    try {
      const res = await analyticsApi.getZoneStatistics(zoneId, period)
      if (id !== requestId) return
      statistics.value = toZoneStatistics(res)
      elapsedMs.value  = Math.round(performance.now() - started)
    } catch (err) {
      if (id !== requestId) return
      statistics.value = null
      error.value = analyticsErrorMessage(err, 'No se pudieron cargar las estadísticas')
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  return { statistics, loading, error, elapsedMs, fetchStatistics }
})
