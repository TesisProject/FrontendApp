import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminApi } from '../infrastructure/admin-api'
import type { AdminSpaceResponse, PointResponse } from '../infrastructure/admin-response'
import { AvailabilityApi } from '../../parking/infrastructure/availability-api'

const availabilityApi = new AvailabilityApi()

/** Espacio del catálogo + estado vivo superpuesto desde la disponibilidad de vision. */
export type AdminSpace = AdminSpaceResponse & { occupied: boolean; monitored: boolean }

export const useAdminSpacesStore = defineStore('adminSpaces', () => {
  const spaces   = ref<AdminSpace[]>([])
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
      // Catálogo de parking + estado vivo de vision (si vision falla, todo se muestra libre).
      const [catalog, availability] = await Promise.all([
        adminApi.getSpacesByZone(id),
        availabilityApi.getByZone(id).catch(() => null),
      ])
      // La disponibilidad de vision solo lista espacios con ROI ⇒ estar ahí = monitoreado.
      const monitored = new Set((availability?.spaces ?? []).map(s => s.parkingSpaceId))
      const occupied = new Set(
        (availability?.spaces ?? []).filter(s => s.occupied).map(s => s.parkingSpaceId),
      )
      spaces.value = catalog.map(s => ({
        ...s,
        occupied:  occupied.has(s.id),
        monitored: monitored.has(s.id),
      }))
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
      spaces.value.push({ ...created, occupied: false, monitored: false })
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

  /** ROI del espacio, o null si aún no está monitoreado (404). */
  async function fetchRoi(spaceId: number): Promise<PointResponse[] | null> {
    try {
      const monitored = await adminApi.getMonitoredSpace(spaceId)
      return monitored.roi ?? []
    } catch {
      return null
    }
  }

  async function saveRoi(spaceId: number, roi: PointResponse[]): Promise<boolean> {
    saving.value = true
    error.value  = null
    try {
      await adminApi.updateSpaceRoi(spaceId, roi)
      setMonitored(spaceId, true)
      return true
    } catch {
      error.value = 'Error al guardar el ROI'
      return false
    } finally {
      saving.value = false
    }
  }

  async function removeMonitoring(spaceId: number): Promise<boolean> {
    saving.value = true
    error.value  = null
    try {
      await adminApi.unmonitorSpace(spaceId)
      setMonitored(spaceId, false)
      return true
    } catch {
      error.value = 'Error al dejar de monitorear el espacio'
      return false
    } finally {
      saving.value = false
    }
  }

  function setMonitored(spaceId: number, monitored: boolean) {
    const space = spaces.value.find(s => s.id === spaceId)
    if (space) space.monitored = monitored
  }

  function clear() {
    spaces.value = []
    zoneId.value = null
    error.value  = null
  }

  return {
    spaces, loading, saving, error,
    fetchByZone, addSpace, removeSpace,
    fetchRoi, saveRoi, removeMonitoring,
    clear,
  }
})
