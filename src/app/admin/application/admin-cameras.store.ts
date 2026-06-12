import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminCamera, AdminCameraForm } from '../domain/model/admin-camera.model'
import type { AdminCameraCreateRequest, AdminCameraUpdateRequest } from '../infrastructure/admin-response'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminCamera } from '../infrastructure/admin-assembler'

export const useAdminCamerasStore = defineStore('admin-cameras', () => {
  const cameras = ref<AdminCamera[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)
  const saving  = ref(false)

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
    saving.value = true
    try {
      const body: AdminCameraCreateRequest = {
        zoneId:          form.zoneId as number,
        name:            form.name,
        streamUrl:       form.streamUrl,
        resolution:      form.resolution || undefined,
        fps:             form.fps !== '' ? (form.fps as number) : undefined,
        detectorVersion: form.detectorVersion || undefined,
      }
      const res = await adminApi.createCamera(body)
      cameras.value.push(toAdminCamera(res))
      return true
    } catch {
      return false
    } finally {
      saving.value = false
    }
  }

  async function updateCamera(id: number, form: AdminCameraForm): Promise<boolean> {
    saving.value = true
    try {
      const body: AdminCameraUpdateRequest = {
        name:            form.name,
        streamUrl:       form.streamUrl,
        resolution:      form.resolution || undefined,
        fps:             form.fps !== '' ? (form.fps as number) : undefined,
        detectorVersion: form.detectorVersion || undefined,
      }
      const res = await adminApi.updateCamera(id, body)
      const idx = cameras.value.findIndex(c => c.id === id)
      if (idx !== -1) cameras.value[idx] = toAdminCamera(res)
      return true
    } catch {
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteCamera(id: number): Promise<boolean> {
    try {
      await adminApi.deleteCamera(id)
      cameras.value = cameras.value.filter(c => c.id !== id)
      return true
    } catch {
      return false
    }
  }

  return { cameras, loading, error, saving, fetchCameras, createCamera, updateCamera, deleteCamera }
})
