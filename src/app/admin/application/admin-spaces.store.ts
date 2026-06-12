import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminApi } from '../infrastructure/admin-api'
import type { AdminSpaceResponse } from '../infrastructure/admin-response'

export const useAdminSpacesStore = defineStore('adminSpaces', () => {
  const spaces   = ref<AdminSpaceResponse[]>([])
  const loading  = ref(false)
  const saving   = ref(false)
  const error    = ref<string | null>(null)
  const zoneId   = ref<number | null>(null)

  async function fetchByZone(id: number) {
    zoneId.value  = id
    spaces.value  = []
    loading.value = true
    error.value   = null
    try {
      spaces.value = await adminApi.getSpacesByZone(id)
    } catch {
      error.value = 'No se pudieron cargar los espacios'
    } finally {
      loading.value = false
    }
  }

  async function addSpace(spaceNumber: string) {
    if (!zoneId.value || !spaceNumber.trim()) return false
    saving.value = true
    error.value  = null
    try {
      const created = await adminApi.createSpace(zoneId.value, spaceNumber.trim().toUpperCase())
      spaces.value.push(created)
      return true
    } catch {
      error.value = 'Error al crear el espacio'
      return false
    } finally {
      saving.value = false
    }
  }

  async function removeSpace(spaceId: number) {
    saving.value = true
    error.value  = null
    try {
      await adminApi.deleteSpace(spaceId)
      spaces.value = spaces.value.filter(s => s.id !== spaceId)
      return true
    } catch {
      error.value = 'Error al eliminar el espacio'
      return false
    } finally {
      saving.value = false
    }
  }

  function clear() {
    spaces.value = []
    zoneId.value = null
    error.value  = null
  }

  return { spaces, loading, saving, error, fetchByZone, addSpace, removeSpace, clear }
})
