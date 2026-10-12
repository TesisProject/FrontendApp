import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminApiKey, AdminApiKeyForm } from '../domain/model/admin-api-key.model'
import type { AdminApiKeyCreateRequest } from '../infrastructure/admin-response'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminApiKey } from '../infrastructure/admin-assembler'
import { adminErrorMessage } from './admin-error-messages'

export const useAdminApiKeysStore = defineStore('admin-api-keys', () => {
  const apiKeys = ref<AdminApiKey[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)
  const saving  = ref(false)
  /** Motivo del último create/revoke fallido, para mostrarlo en la vista. */
  const actionError = ref<string | null>(null)
  /** Key completa recién creada — el backend solo la entrega una vez. */
  const createdKey = ref<string | null>(null)
  /** Metadata de la key recién creada (para adaptar las instrucciones al rol). */
  const createdMetadata = ref<AdminApiKey | null>(null)

  async function fetchApiKeys() {
    loading.value = true
    error.value   = null
    try {
      const res = await adminApi.getApiKeys()
      apiKeys.value = res.map(toAdminApiKey)
    } catch {
      error.value = 'No se pudieron cargar las API keys'
    } finally {
      loading.value = false
    }
  }

  async function createApiKey(form: AdminApiKeyForm): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      // Una key FOG queda ligada a su nodo (y solo accede a él); una PREDICTION no admite nodo.
      const body: AdminApiKeyCreateRequest = {
        name:      form.name.trim(),
        role:      form.role,
        nodeId:    form.role === 'FOG' && form.nodeId !== '' ? form.nodeId : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }
      const res = await adminApi.createApiKey(body)
      const metadata = toAdminApiKey(res.metadata)
      apiKeys.value.push(metadata)
      createdKey.value      = res.apiKey
      createdMetadata.value = metadata
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function revokeApiKey(id: number): Promise<boolean> {
    actionError.value = null
    try {
      await adminApi.revokeApiKey(id)
      apiKeys.value = apiKeys.value.filter(k => k.id !== id)
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e, 'No se pudo revocar la API key')
      return false
    }
  }

  function clearCreatedKey() {
    createdKey.value      = null
    createdMetadata.value = null
  }

  return {
    apiKeys, loading, error, saving, actionError, createdKey, createdMetadata,
    fetchApiKeys, createApiKey, revokeApiKey, clearCreatedKey,
  }
})
