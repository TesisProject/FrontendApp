import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ratingApi } from '../infrastructure/rating-api'
import type { Rating, ZoneRatingEntry } from '../domain/model/rating.model'

export const useRatingsStore = defineStore('ratings', () => {
  // Ratings propias del usuario (cacheadas por userId)
  const ratings       = ref<Rating[]>([])
  const loadedForUser = ref<number | null>(null)
  const loading       = ref(false)

  // Reseñas públicas por zona
  const zoneReviews     = ref<Record<number, ZoneRatingEntry[]>>({})
  const reviewsLoading  = ref<Record<number, boolean>>({})

  const saving = ref(false)
  const error  = ref<string | null>(null)

  const forZone = (zoneId: number) =>
    computed(() => ratings.value.find(r => r.zoneId === zoneId) ?? null)

  const reviewsForZone = (zoneId: number) =>
    computed(() => zoneReviews.value[zoneId] ?? [])

  const avgStars = (zoneId: number) =>
    computed(() => {
      const list = zoneReviews.value[zoneId] ?? []
      if (!list.length) return 0
      return list.reduce((s, r) => s + r.stars, 0) / list.length
    })

  async function fetchByUser(userId: number) {
    if (loadedForUser.value === userId) return    // mismo usuario, ya cargado
    loadedForUser.value = userId
    ratings.value = []                            // limpia datos del usuario anterior
    loading.value = true
    error.value   = null
    try {
      ratings.value = await ratingApi.getByUser(userId)
    } catch {
      error.value = 'No se pudieron cargar las calificaciones'
    } finally {
      loading.value = false
    }
  }

  async function fetchByZone(zoneId: number) {
    if (zoneReviews.value[zoneId]) return     // ya cargadas
    reviewsLoading.value[zoneId] = true
    try {
      zoneReviews.value[zoneId] = await ratingApi.getByZone(zoneId)
    } catch {
      zoneReviews.value[zoneId] = []          // silencioso — endpoint puede no estar aún
    } finally {
      reviewsLoading.value[zoneId] = false
    }
  }

  async function submit(userId: number, zoneId: number, stars: number, comment: string, type: string) {
    saving.value = true
    error.value  = null
    try {
      const exists = ratings.value.some(r => r.zoneId === zoneId)
      const result = exists
        ? await ratingApi.update(userId, zoneId, stars, comment || undefined, type || undefined)
        : await ratingApi.create(userId, zoneId, stars, comment || undefined, type || undefined)

      const idx = ratings.value.findIndex(r => r.zoneId === zoneId)
      if (idx >= 0) ratings.value[idx] = result
      else          ratings.value.push(result)

      // Invalida el cache público para que el siguiente fetch traiga la reseña nueva
      delete zoneReviews.value[zoneId]
      return true
    } catch {
      error.value = 'Error al guardar la calificación'
      return false
    } finally {
      saving.value = false
    }
  }

  async function remove(userId: number, zoneId: number) {
    saving.value = true
    error.value  = null
    try {
      await ratingApi.remove(userId, zoneId)
      ratings.value = ratings.value.filter(r => r.zoneId !== zoneId)
      delete zoneReviews.value[zoneId]
      return true
    } catch {
      error.value = 'Error al eliminar la calificación'
      return false
    } finally {
      saving.value = false
    }
  }

  function reset() {
    ratings.value       = []
    loadedForUser.value = null
    zoneReviews.value   = {}
    reviewsLoading.value = {}
    saving.value        = false
    error.value         = null
  }

  return {
    ratings, loading, saving, error,
    zoneReviews, reviewsLoading,
    forZone, reviewsForZone, avgStars,
    fetchByUser, fetchByZone, submit, remove, reset,
  }
})
