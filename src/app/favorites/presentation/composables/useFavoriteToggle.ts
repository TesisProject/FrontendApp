import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useAuthStore } from '../../../iam/application/auth.store'
import { useFavoriteStore } from '../../application/favorite.store'

/**
 * Guardar y quitar favoritos desde cualquier vista (HU-28). Guardar es inmediato; quitar pide
 * confirmación antes de borrar (E2). Se usa junto con `RemoveFavoriteDialog`.
 */
export function useFavoriteToggle() {
  const authStore     = useAuthStore()
  const favoriteStore = useFavoriteStore()
  const userId = computed(() => authStore.user?.id ?? 0)

  const pending  = ref<{ zoneId: number; zoneName: string } | null>(null)
  const removing = ref(false)
  const confirmOpen = computed(() => pending.value !== null)

  async function toggle(zoneId: number, zoneName: string) {
    if (!userId.value) return
    if (favoriteStore.isFavorite(zoneId)) {
      pending.value = { zoneId, zoneName }
      return
    }
    const ok = await favoriteStore.addFavorite(userId.value, zoneId)
    if (ok) toast.success('Agregada a favoritos', { description: zoneName })
    else toast.error('No se pudo guardar en favoritos. Inténtalo de nuevo.')
  }

  /** Abre la confirmación para quitar (la vista de favoritos solo quita). */
  function askRemove(zoneId: number, zoneName: string) {
    pending.value = { zoneId, zoneName }
  }

  async function confirmRemove() {
    if (!pending.value) return
    removing.value = true
    const { zoneId, zoneName } = pending.value
    const ok = await favoriteStore.removeFavorite(userId.value, zoneId)
    removing.value = false
    pending.value  = null
    if (ok) toast.success('Eliminada de favoritos', { description: zoneName })
    else toast.error('No se pudo quitar de favoritos. Inténtalo de nuevo.')
  }

  function cancelRemove() {
    if (!removing.value) pending.value = null
  }

  return { pending, removing, confirmOpen, toggle, askRemove, confirmRemove, cancelRemove }
}
