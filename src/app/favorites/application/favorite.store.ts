import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { FavoriteApi } from '../infrastructure/favorite-api'
import { toFavorite } from '../infrastructure/favorite-assembler'
import type { Favorite } from '../domain/model/favorite.model'

const favoriteApi = new FavoriteApi()

export const useFavoriteStore = defineStore('favorite', () => {
  const favorites = ref<Favorite[]>([])
  const loading   = ref(false)
  const error     = ref<string | null>(null)

  const favoriteZoneIds = computed(() => new Set(favorites.value.map(f => f.zoneId)))

  function isFavorite(zoneId: number): boolean {
    return favoriteZoneIds.value.has(zoneId)
  }

  async function fetchFavorites(userId: number) {
    loading.value = true
    error.value   = null
    try {
      const responses = await favoriteApi.getByUser(userId)
      favorites.value = responses.map(toFavorite)
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar favoritos'
    } finally {
      loading.value = false
    }
  }

  async function addFavorite(userId: number, zoneId: number) {
    try {
      await favoriteApi.add(userId, zoneId)
      favorites.value.push({ userId, zoneId, savedAt: new Date().toISOString() })
    } catch (err: any) {
      error.value = err?.message ?? 'Error al agregar favorito'
    }
  }

  async function removeFavorite(userId: number, zoneId: number) {
    try {
      await favoriteApi.remove(userId, zoneId)
      favorites.value = favorites.value.filter(f => f.zoneId !== zoneId)
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar favorito'
    }
  }

  return {
    favorites,
    loading,
    error,
    favoriteZoneIds,
    isFavorite,
    fetchFavorites,
    addFavorite,
    removeFavorite,
  }
})
