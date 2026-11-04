import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { FavoriteApi } from '../infrastructure/favorite-api'
import { toFavorite } from '../infrastructure/favorite-assembler'
import type { Favorite } from '../domain/model/favorite.model'

const favoriteApi = new FavoriteApi()

/**
 * Favoritos del usuario (HU-28). Agregar y quitar actualizan la lista en el momento con la
 * respuesta del backend, sin recargar; devuelven `true`/`false` para que la vista muestre el toast.
 */
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
    } catch {
      error.value = 'No se pudieron cargar tus favoritos.'
    } finally {
      loading.value = false
    }
  }

  async function addFavorite(userId: number, zoneId: number): Promise<boolean> {
    try {
      const saved = toFavorite(await favoriteApi.add(userId, zoneId))
      favorites.value = [saved, ...favorites.value.filter(f => f.zoneId !== zoneId)]
      return true
    } catch {
      return false
    }
  }

  async function removeFavorite(userId: number, zoneId: number): Promise<boolean> {
    try {
      await favoriteApi.remove(userId, zoneId)
      favorites.value = favorites.value.filter(f => f.zoneId !== zoneId)
      return true
    } catch {
      return false
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
