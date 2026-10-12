import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AdminFirmwareRelease, AdminFirmwareUploadForm } from '../domain/model/admin-firmware.model'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminFirmwareRelease } from '../infrastructure/admin-assembler'
import { adminErrorMessage } from './admin-error-messages'

export const useAdminFirmwareStore = defineStore('admin-firmware', () => {
  /** De la versión más alta a la más baja (el backend ya las da así). */
  const releases = ref<AdminFirmwareRelease[]>([])
  const loading  = ref(false)
  const error    = ref<string | null>(null)
  const uploading      = ref(false)
  /** 0–1 mientras se sube el binario. */
  const uploadProgress = ref(0)
  const uploadError    = ref<string | null>(null)

  const latestVersion = computed(() => releases.value[0]?.version ?? null)
  const versions      = computed(() => releases.value.map(r => r.version))

  async function fetchReleases() {
    loading.value = true
    error.value   = null
    try {
      const res = await adminApi.getFirmwareReleases()
      releases.value = res.map(toAdminFirmwareRelease).sort((a, b) => b.version - a.version)
    } catch {
      error.value = 'No se pudieron cargar las versiones de firmware'
    } finally {
      loading.value = false
    }
  }

  /** Publica una versión. La vista ya validó fichero, versión y notas. */
  async function uploadRelease(form: AdminFirmwareUploadForm): Promise<AdminFirmwareRelease | null> {
    if (!form.file || form.version === '') return null
    uploading.value      = true
    uploadProgress.value = 0
    uploadError.value    = null
    try {
      const data = new FormData()
      data.append('file', form.file, form.file.name)
      data.append('version', String(form.version))
      const notes = form.notes.trim()
      if (notes) data.append('notes', notes)
      const res = await adminApi.uploadFirmwareRelease(data, f => { uploadProgress.value = f })
      const release = toAdminFirmwareRelease(res)
      releases.value = [release, ...releases.value].sort((a, b) => b.version - a.version)
      return release
    } catch (e) {
      uploadError.value = adminErrorMessage(e, 'No se pudo publicar la versión')
      return null
    } finally {
      uploading.value = false
    }
  }

  return {
    releases, loading, error, uploading, uploadProgress, uploadError,
    latestVersion, versions, fetchReleases, uploadRelease,
  }
})
