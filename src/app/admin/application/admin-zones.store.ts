import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminZone, AdminZoneForm } from '../domain/model/admin-zone.model'
import type { ZonePhoto } from '../../parking/domain/model/zone-photo.model'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminZone, toAdminZoneRequest } from '../infrastructure/admin-assembler'
import { toZonePhoto } from '../../parking/infrastructure/zone-assembler'
import { AvailabilityApi } from '../../parking/infrastructure/availability-api'
import type { ZoneAvailabilityResponse } from '../../parking/infrastructure/availability-response'
import { zonePhotoErrorMessage, zoneSaveErrorMessage } from './admin-error-messages'

const availabilityApi = new AvailabilityApi()

/** Resultado de una operación sobre una foto: la foto subida, o el mensaje de error para mostrar. */
export type ZonePhotoResult = { ok: true; photo?: ZonePhoto } | { ok: false; error: string }

export const useAdminZonesStore = defineStore('admin-zones', () => {
  const zones       = ref<AdminZone[]>([])
  const loading     = ref(false)
  const error       = ref<string | null>(null)
  const saving      = ref(false)
  /** Mensaje del último fallo al crear/actualizar una zona. */
  const actionError = ref<string | null>(null)

  /**
   * Zona estática de parking + disponibilidad viva de vision (si vision falla, solo estática).
   * `silent` (refresco periódico) no muestra la carga ni borra la lista si falla.
   */
  async function fetchZones(options?: { silent?: boolean }) {
    if (!options?.silent) {
      loading.value = true
      error.value   = null
    }
    try {
      const [res, availability] = await Promise.all([
        adminApi.getZones(),
        availabilityApi.getAll().catch(() => [] as ZoneAvailabilityResponse[]),
      ])
      const availabilityByZone = new Map(availability.map(a => [a.zoneId, a]))
      zones.value = res.map(r => toAdminZone(r, availabilityByZone.get(r.id)))
    } catch {
      if (!options?.silent) error.value = 'No se pudieron cargar las zonas'
    } finally {
      if (!options?.silent) loading.value = false
    }
  }

  function replaceZone(zone: AdminZone) {
    const idx = zones.value.findIndex(z => z.id === zone.id)
    if (idx === -1) zones.value.push(zone)
    else zones.value[idx] = zone
  }

  /** Conserva la ocupación ya cargada: la respuesta de parking no la trae. */
  function withLiveOccupancy(zone: AdminZone): AdminZone {
    const prev = zones.value.find(z => z.id === zone.id)
    return prev
      ? { ...zone, occupiedCount: prev.occupiedCount, freeCount: prev.freeCount, occupancyPercentage: prev.occupancyPercentage, classification: prev.classification }
      : zone
  }

  async function createZone(form: AdminZoneForm): Promise<AdminZone | null> {
    saving.value = true
    actionError.value = null
    try {
      const zone = toAdminZone(await adminApi.createZone(toAdminZoneRequest(form)))
      replaceZone(zone)
      return zone
    } catch (err) {
      actionError.value = zoneSaveErrorMessage(err)
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateZone(id: number, form: AdminZoneForm): Promise<AdminZone | null> {
    saving.value = true
    actionError.value = null
    try {
      const zone = withLiveOccupancy(toAdminZone(await adminApi.updateZone(id, toAdminZoneRequest(form))))
      replaceZone(zone)
      return zone
    } catch (err) {
      actionError.value = zoneSaveErrorMessage(err)
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteZone(id: number): Promise<boolean> {
    try {
      await adminApi.deleteZone(id)
      zones.value = zones.value.filter(z => z.id !== id)
      return true
    } catch {
      return false
    }
  }

  async function uploadPhoto(zoneId: number, file: File): Promise<ZonePhotoResult> {
    try {
      const photo = toZonePhoto(await adminApi.uploadZonePhoto(zoneId, file))
      const zone = zones.value.find(z => z.id === zoneId)
      if (zone) zone.photos = [...zone.photos, photo]
      return { ok: true, photo }
    } catch (err) {
      return { ok: false, error: zonePhotoErrorMessage(err) }
    }
  }

  async function deletePhoto(zoneId: number, photoId: string): Promise<ZonePhotoResult> {
    try {
      await adminApi.deleteZonePhoto(zoneId, photoId)
      const zone = zones.value.find(z => z.id === zoneId)
      if (zone) zone.photos = zone.photos.filter(p => p.id !== photoId)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: zonePhotoErrorMessage(err) }
    }
  }

  return {
    zones, loading, error, saving, actionError,
    fetchZones, createZone, updateZone, deleteZone, uploadPhoto, deletePhoto,
  }
})
