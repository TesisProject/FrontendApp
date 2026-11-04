import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DemandPeaks } from '../domain/model/demand-peaks.model'
import { analyticsApi, type PeaksQuery } from '../infrastructure/analytics-api'
import { toDemandPeaks } from '../infrastructure/analytics-assembler'
import { analyticsErrorMessage } from './analytics-error-messages'

/** Demanda por zona y franja con los picos identificados (HU-19) y su exportación. */
export const useDemandPeaksStore = defineStore('demand-peaks', () => {
  const peaks     = ref<DemandPeaks | null>(null)
  /** Filtro con que se cargó `peaks`: la exportación usa exactamente el mismo. */
  const query     = ref<PeaksQuery | null>(null)
  const loading   = ref(false)
  const error     = ref<string | null>(null)
  const exporting = ref(false)

  let requestId = 0

  async function fetchPeaks(q: PeaksQuery) {
    const id = ++requestId
    loading.value = true
    error.value   = null
    try {
      const res = await analyticsApi.getPeaks(q)
      if (id !== requestId) return
      peaks.value = toDemandPeaks(res)
      query.value = q
    } catch (err) {
      if (id !== requestId) return
      peaks.value = null
      error.value = analyticsErrorMessage(err, 'No se pudo cargar la demanda por zona')
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  /** Descarga el CSV del backend con el filtro aplicado. Devuelve el mensaje de error o `null`. */
  async function exportCsv(): Promise<string | null> {
    if (!query.value) return 'Primero aplica un filtro'
    exporting.value = true
    try {
      await analyticsApi.exportPeaksCsv(query.value)
      return null
    } catch (err) {
      return analyticsErrorMessage(err, 'No se pudo exportar el CSV')
    } finally {
      exporting.value = false
    }
  }

  return { peaks, query, loading, error, exporting, fetchPeaks, exportCsv }
})
