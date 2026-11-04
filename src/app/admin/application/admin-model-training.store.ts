import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModelTrainingRun, ModelVersion } from '../domain/model/admin-model-training.model'
import { adminModelTrainingApi } from '../infrastructure/admin-model-training-api'
import { adminErrorMessage } from './admin-error-messages'

/**
 * Vista "Modelo IA" (HU-27): corridas del reentrenamiento (en vivo desde GitHub) y versiones
 * publicadas. Las dos listas se cargan por separado: sin token de GitHub las corridas fallan con 503,
 * pero las versiones las guarda el backend y se siguen viendo.
 */
export const useAdminModelTrainingStore = defineStore('admin-model-training', () => {
  const runs          = ref<ModelTrainingRun[]>([])
  const versions      = ref<ModelVersion[]>([])
  const runsLoading   = ref(false)
  const runsError     = ref<string | null>(null)
  const versionsError = ref<string | null>(null)
  const requesting    = ref(false)

  async function fetchRuns(options?: { silent?: boolean }) {
    if (!options?.silent) runsLoading.value = true
    try {
      runs.value = await adminModelTrainingApi.getRuns()
      runsError.value = null
    } catch (err) {
      runsError.value = adminErrorMessage(err, 'No se pudieron cargar las corridas')
    } finally {
      runsLoading.value = false
    }
  }

  async function fetchVersions() {
    try {
      versions.value = await adminModelTrainingApi.getVersions()
      versionsError.value = null
    } catch (err) {
      versionsError.value = adminErrorMessage(err, 'No se pudieron cargar las versiones')
    }
  }

  /** Pide una corrida. Devuelve el mensaje de error, o `null` si GitHub la aceptó. */
  async function retrain(dryRun = false): Promise<string | null> {
    requesting.value = true
    try {
      await adminModelTrainingApi.retrain(dryRun)
      return null
    } catch (err) {
      return adminErrorMessage(err, 'No se pudo iniciar el reentrenamiento')
    } finally {
      requesting.value = false
    }
  }

  return { runs, versions, runsLoading, runsError, versionsError, requesting, fetchRuns, fetchVersions, retrain }
})
