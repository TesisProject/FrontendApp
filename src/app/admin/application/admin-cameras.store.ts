import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminCamera, AdminCameraForm } from '../domain/model/admin-camera.model'
import type { AdminCameraCreateRequest, AdminCameraUpdateRequest } from '../infrastructure/admin-response'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminCamera } from '../infrastructure/admin-assembler'
import { errorStatus } from '../../shared/infrastructure/http-client'

// 409 CAMERA_HAS_MONITORED_SPACES: la cámara aún cubre espacios con ROI.
const COVERS_SPACES_MSG = 'La cámara aún cubre espacios monitoreados: reasígnalos a otra cámara o quítales el ROI primero'

function actionErrorMessage(e: unknown, fallback: string): string {
  return errorStatus(e) === 409 ? COVERS_SPACES_MSG : fallback
}

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

  async function createCamera(form: AdminCameraForm): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      const body: AdminCameraCreateRequest = {
        zoneId:   form.zoneId as number,
        nodeId:   form.nodeId !== '' ? (form.nodeId as number) : undefined,
        name:     form.name || undefined,
        location: form.location || undefined,
      }
      const res = await adminApi.createCamera(body)
      cameras.value.push(toAdminCamera(res))
      return true
    } catch (e) {
      actionError.value = actionErrorMessage(e, 'Ocurrió un error, intenta de nuevo')
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
      const res = await adminApi.updateCamera(id, body)
      const idx = cameras.value.findIndex(c => c.id === id)
      if (idx !== -1) cameras.value[idx] = toAdminCamera(res)
      return true
    } catch (e) {
      actionError.value = actionErrorMessage(e, 'Ocurrió un error, intenta de nuevo')
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
      actionError.value = actionErrorMessage(e, 'No se pudo eliminar la cámara')
      return false
    }
  }

  return {
    cameras, loading, error, saving, actionError,
    fetchCameras, createCamera, updateCamera, deleteCamera,
  }
})
