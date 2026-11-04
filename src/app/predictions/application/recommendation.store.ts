import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAsyncState } from '../../shared/helpers/async-state'
import type { LatLng } from '../../parking/domain/geo'
import type { ZoneRecommendation } from '../domain/model/recommendation.model'
import { recommendationApi } from '../infrastructure/recommendation-api'
import { toRecommendations } from '../infrastructure/recommendation-assembler'

/** El backend devuelve hasta `limit`; la HU-13 pide al menos 3 sugerencias cuando existen. */
export const RECOMMENDATION_LIMIT = 3
export const RECOMMENDATION_RADIUS_KM = 5

/** Recomendaciones de zonas con más disponibilidad cerca del usuario (HU-13). */
export const useRecommendationStore = defineStore('recommendations', () => {
  const state = useAsyncState<ZoneRecommendation[]>([])
  const generatedAt = ref<string | null>(null)
  let request = 0

  /**
   * Pide las recomendaciones para `origin`. Con `silent` (refresco de 30 s o cambio de ubicación) no
   * pasa por "Cargando" y, si falla, conserva las anteriores. Solo se aplica la última respuesta.
   */
  async function fetchRecommendations(origin: LatLng, options?: { silent?: boolean }) {
    const current = ++request
    if (!options?.silent) state.setLoading()
    try {
      const result = toRecommendations(await recommendationApi.getRecommendations({
        lat: origin.lat, lng: origin.lng, radiusKm: RECOMMENDATION_RADIUS_KM, limit: RECOMMENDATION_LIMIT,
      }))
      if (current !== request) return
      state.setData(result.items)
      generatedAt.value = result.generatedAt
    } catch (err: any) {
      if (current !== request) return
      if (options?.silent) state.setLoading(false)
      else state.setError(err?.message ?? 'No se pudieron cargar las recomendaciones')
    }
  }

  return {
    recommendations: state.data,
    loading: state.loading,
    error: state.error,
    generatedAt,
    fetchRecommendations,
  }
})
