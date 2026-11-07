import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminApi } from '../infrastructure/admin-api'
import type {
  AdminSpaceResponse, MonitoredSpaceResponse, PointResponse, CameraScreenshotResponse,
} from '../infrastructure/admin-response'
import type { AdminCamera } from '../domain/model/admin-camera.model'
import { toAdminCamera } from '../infrastructure/admin-assembler'
import { AvailabilityApi } from '../../parking/infrastructure/availability-api'
import { adminErrorMessage } from './admin-error-messages'

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

  /**
   * Agrega un espacio a la zona abierta. Se rechaza antes de llamar al backend un número repetido en
   * la zona o pasar del total de espacios declarado (`maxSpaces`); el backend valida lo mismo.
   */
  async function addSpace(spaceNumber: string, maxSpaces?: number) {
    const number = spaceNumber.trim().toUpperCase()
    if (!zoneId.value || !number) return false
    error.value = null
    if (spaces.value.some(s => s.spaceNumber.trim().toUpperCase() === number)) {
      error.value = `Ya existe el espacio ${number} en esta zona`
      return false
    }
    if (maxSpaces !== undefined && spaces.value.length >= maxSpaces) {
      error.value = `La zona admite ${maxSpaces} espacio${maxSpaces !== 1 ? 's' : ''}: aumenta el total de espacios de la zona para agregar más`
      return false
    }
    saving.value = true
    try {
      const created = await adminApi.createSpace(zoneId.value, number)
      spaces.value.push({ ...created, occupied: false, monitored: false })
      return true
    } catch (err) {
      error.value = adminErrorMessage(err, 'Error al crear el espacio')
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

  /** Cámaras de la zona: cada ROI se dibuja sobre la foto de una de ellas. */
  async function fetchZoneCameras(id: number): Promise<AdminCamera[]> {
    return (await adminApi.getCameras(id)).map(toAdminCamera)
  }

  /** Última foto de la cámara, o null si aún no subió ninguna (404). */
  async function fetchCameraScreenshot(cameraId: number): Promise<CameraScreenshotResponse | null> {
    try {
      return await adminApi.getCameraScreenshot(cameraId)
    } catch {
      return null
    }
  }

  /** Espacio monitoreado (cámara que lo cubre + ROI), o null si aún no está monitoreado (404). */
  async function fetchMonitored(spaceId: number): Promise<MonitoredSpaceResponse | null> {
    try {
      return await adminApi.getMonitoredSpace(spaceId)
    } catch {
      return null
    }
  }

  /** Asigna el espacio a la cámara con su ROI (coordenadas de la foto ya girada). */
  async function saveRoi(spaceId: number, cameraId: number, roi: PointResponse[]): Promise<boolean> {
    saving.value = true
    error.value  = null
    try {
      await adminApi.updateSpaceRoi(spaceId, { cameraId, roi })
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
    fetchZoneCameras, fetchCameraScreenshot, fetchMonitored, saveRoi, removeMonitoring,
    clear,
  }
})
