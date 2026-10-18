import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AdminCamera, AdminCameraCreateForm, AdminCameraDeviceForm, AdminCameraForm,
} from '../domain/model/admin-camera.model'
import type { AdminCameraCreateRequest, AdminCameraUpdateRequest } from '../infrastructure/admin-response'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminCamera, toAdminCameraFirmware } from '../infrastructure/admin-assembler'
import type { AdminCameraFirmware } from '../domain/model/admin-firmware.model'
import { CAPTURE_DEFAULTS, normalizeMac, sameCapture } from '../domain/camera-device'
import { adminErrorMessage } from './admin-error-messages'

export const useAdminCamerasStore = defineStore('admin-cameras', () => {
  const cameras = ref<AdminCamera[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)
  const saving  = ref(false)
  // Motivo del último create/update/delete fallido, para mostrarlo en la vista.
  const actionError = ref<string | null>(null)

  async function fetchCameras() {
    loading.value = true
    error.value   = null
    try {
      const res = await adminApi.getCameras()
      cameras.value = res.map(toAdminCamera)
    } catch {
      error.value = 'No se pudieron cargar las cámaras'
    } finally {
      loading.value = false
    }
  }

  function replaceCamera(camera: AdminCamera) {
    const idx = cameras.value.findIndex(c => c.id === camera.id)
    if (idx !== -1) cameras.value[idx] = camera
  }

  /** La vista ya validó la MAC; aquí solo se normaliza. Rotación y captura se omiten si son las de por defecto. */
  async function createCamera(form: AdminCameraCreateForm): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      const body: AdminCameraCreateRequest = {
        zoneId:        form.zoneId as number,
        nodeId:        form.nodeId !== '' ? (form.nodeId as number) : undefined,
        name:          form.name || undefined,
        location:      form.location || undefined,
        mac:           normalizeMac(form.mac) ?? form.mac.trim(),
        rotation:      form.rotation !== 0 ? form.rotation : undefined,
        capture:       sameCapture(form.capture, CAPTURE_DEFAULTS) ? undefined : { ...form.capture },
      }
      const res = await adminApi.createCamera(body)
      cameras.value.push(toAdminCamera(res))
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function updateCamera(id: number, form: AdminCameraForm): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      const body: AdminCameraUpdateRequest = {
        zoneId:   form.zoneId as number,
        nodeId:   form.nodeId !== '' ? (form.nodeId as number) : undefined,
        name:     form.name || undefined,
        location: form.location || undefined,
        active:   form.active,
      }
      replaceCamera(toAdminCamera(await adminApi.updateCamera(id, body)))
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e)
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Reemplaza MAC, rotación y captura. MAC vacía solo es posible si la cámara no tenía: se envía
   * `null` (un `""` daría 400 INVALID_MAC_ADDRESS).
   */
  async function updateDeviceSettings(id: number, form: AdminCameraDeviceForm): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      const mac = form.mac.trim()
      const res = await adminApi.updateCameraDeviceSettings(id, {
        mac:      mac === '' ? null : normalizeMac(mac) ?? mac,
        rotation: form.rotation,
        capture:  { ...form.capture },
      })
      replaceCamera(toAdminCamera(res))
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e)
      return false
    } finally {
      saving.value = false
    }
  }

  /** Vuelve a leer una cámara (p. ej. para ver la generación de alta nueva). */
  async function refreshCamera(id: number) {
    try {
      replaceCamera(toAdminCamera(await adminApi.getCamera(id)))
    } catch {
      // La fila se queda con los datos anteriores; no es un fallo de la acción del usuario.
    }
  }

  async function resetEnrollment(id: number): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      await adminApi.resetCameraEnrollment(id)
      await refreshCamera(id)
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e, 'No se pudo reiniciar el alta')
      return false
    } finally {
      saving.value = false
    }
  }

  /** Nº de espacios con ROI que cubre la cámara, o `null` si no se pudo saber. */
  async function countRoiSpaces(id: number): Promise<number | null> {
    try {
      return (await adminApi.getCameraConfig(id)).spaces.length
    } catch {
      return null
    }
  }

  // ── Firmware ──────────────────────────────────────────────────────────
  /** Fusiona el estado de firmware (el endpoint no devuelve la cámara entera) en la fila. */
  function mergeFirmware(fw: AdminCameraFirmware) {
    const camera = cameras.value.find(c => c.id === fw.cameraId)
    if (!camera) return
    camera.firmware = { target: fw.target, reported: fw.reported, reportedAt: fw.reportedAt, status: fw.status }
  }

  /** Estado de firmware con la fecha de asignación, que no viene en el listado. */
  async function fetchCameraFirmware(id: number): Promise<AdminCameraFirmware | null> {
    try {
      const fw = toAdminCameraFirmware(await adminApi.getCameraFirmware(id))
      mergeFirmware(fw)
      return fw
    } catch {
      return null
    }
  }

  /** 409 FIRMWARE_DOWNGRADE_NOT_ALLOWED si es menor que la asignada o que la informada. */
  async function assignFirmware(id: number, version: number): Promise<AdminCameraFirmware | null> {
    saving.value      = true
    actionError.value = null
    try {
      const fw = toAdminCameraFirmware(await adminApi.assignCameraFirmware(id, version))
      mergeFirmware(fw)
      return fw
    } catch (e) {
      actionError.value = adminErrorMessage(e, 'No se pudo asignar la versión')
      return null
    } finally {
      saving.value = false
    }
  }

  /** Deja de ofrecerle actualizaciones; no desinstala nada. */
  async function clearFirmware(id: number): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      await adminApi.clearCameraFirmware(id)
      await fetchCameraFirmware(id)
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e, 'No se pudo quitar la versión asignada')
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteCamera(id: number): Promise<boolean> {
    actionError.value = null
    try {
      await adminApi.deleteCamera(id)
      cameras.value = cameras.value.filter(c => c.id !== id)
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e, 'No se pudo eliminar la cámara')
      return false
    }
  }

  return {
    cameras, loading, error, saving, actionError,
    fetchCameras, createCamera, updateCamera, deleteCamera,
    updateDeviceSettings, refreshCamera, resetEnrollment, countRoiSpaces,
    fetchCameraFirmware, assignFirmware, clearFirmware,
  }
})
