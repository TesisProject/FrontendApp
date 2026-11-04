import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminZone, AdminZoneForm } from '../domain/model/admin-zone.model'
import type { ZonePhoto } from '../../parking/domain/model/zone-photo.model'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminZone, toAdminZoneRequest } from '../infrastructure/admin-assembler'
import { toZonePhoto } from '../../parking/infrastructure/zone-assembler'
import { AvailabilityApi } from '../../parking/infrastructure/availability-api'
import type { ZoneAvailabilityResponse } from '../../parking/infrastructure/availability-response'
import { adminErrorMessage, zonePhotoErrorMessage, zoneSaveErrorMessage } from './admin-error-messages'
import { validationFieldErrors, type FieldErrors } from './admin-field-errors'
import { errorCode } from '../../shared/infrastructure/http-client'
import type { ZoneDeletionImpactResponse } from '../infrastructure/admin-response'

const availabilityApi = new AvailabilityApi()

/** Resultado de una operación sobre una foto: la foto subida, o el mensaje de error para mostrar. */
export type ZonePhotoResult = { ok: true; photo?: ZonePhoto } | { ok: false; error: string }

/**
 * Resultado de eliminar una zona (HU-22): borrada, o con datos asociados que piden una segunda
 * confirmación (con sus conteos), o un error para mostrar.
 */
export type ZoneDeleteResult =
  | { status: 'deleted' }
  | { status: 'needs-confirmation'; impact: ZoneDeletionImpactResponse }
  | { status: 'error'; error: string }

/** Mensajes por campo de `CreateZoneRequest`/`UpdateZoneRequest` cuando el backend responde VALIDATION_ERROR. */
export const ZONE_FIELD_LABELS: Record<string, string> = {
  name:          'El nombre de la zona es obligatorio',
  street:        'La calle es obligatoria',
  district:      'El distrito es obligatorio',
  city:          'La ciudad es obligatoria',
  latitude:      'La latitud debe estar entre -90 y 90',
  longitude:     'La longitud debe estar entre -180 y 180',
  totalSpaces:   'El total de espacios debe ser al menos 1',
  totalCapacity: 'La capacidad total debe ser al menos 1',
  openingHours:  'Revisa el horario',
  googlePlaceId: 'El Place ID de Google no es válido',
}

export const useAdminZonesStore = defineStore('admin-zones', () => {
  const zones       = ref<AdminZone[]>([])
  const loading     = ref(false)
  const error       = ref<string | null>(null)
  const saving      = ref(false)
  /** Mensaje del último fallo al crear/actualizar una zona. */
  const actionError = ref<string | null>(null)
  /** Errores por campo del último guardado rechazado por el backend (VALIDATION_ERROR). */
  const fieldErrors = ref<FieldErrors>({})

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
    fieldErrors.value = {}
    try {
      const zone = toAdminZone(await adminApi.createZone(toAdminZoneRequest(form)))
      replaceZone(zone)
      return zone
    } catch (err) {
      fieldErrors.value = validationFieldErrors(err, ZONE_FIELD_LABELS)
      actionError.value = zoneSaveErrorMessage(err)
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateZone(id: number, form: AdminZoneForm): Promise<AdminZone | null> {
    saving.value = true
    actionError.value = null
    fieldErrors.value = {}
    try {
      const zone = withLiveOccupancy(toAdminZone(await adminApi.updateZone(id, toAdminZoneRequest(form))))
      replaceZone(zone)
      return zone
    } catch (err) {
      fieldErrors.value = validationFieldErrors(err, ZONE_FIELD_LABELS)
      actionError.value = zoneSaveErrorMessage(err)
      return null
    } finally {
      saving.value = false
    }
  }

  /**
   * Elimina la zona. Sin `confirmed`, una zona con espacios o cámaras no se borra: el backend
   * responde 409 ZONE_HAS_ACTIVE_DATA y se devuelven los conteos para la segunda confirmación.
   */
  async function deleteZone(id: number, confirmed = false): Promise<ZoneDeleteResult> {
    try {
      await adminApi.deleteZone(id, confirmed)
      zones.value = zones.value.filter(z => z.id !== id)
      return { status: 'deleted' }
    } catch (err) {
      if (!confirmed && errorCode(err) === 'ZONE_HAS_ACTIVE_DATA') {
        try {
          return { status: 'needs-confirmation', impact: await adminApi.getZoneDeletionImpact(id) }
        } catch (impactErr) {
          return { status: 'error', error: adminErrorMessage(impactErr, 'No se pudo consultar qué datos tiene la zona') }
        }
      }
      return { status: 'error', error: adminErrorMessage(err, 'No se pudo eliminar la zona') }
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
    zones, loading, error, saving, actionError, fieldErrors,
    fetchZones, createZone, updateZone, deleteZone, uploadPhoto, deletePhoto,
  }
})
