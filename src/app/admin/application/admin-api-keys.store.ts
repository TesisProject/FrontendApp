import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminApiKey, AdminApiKeyForm } from '../domain/model/admin-api-key.model'
import type { AdminApiKeyCreateRequest } from '../infrastructure/admin-response'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminApiKey } from '../infrastructure/admin-assembler'

export const useAdminApiKeysStore = defineStore('admin-api-keys', () => {
  const apiKeys = ref<AdminApiKey[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)
  const saving  = ref(false)
  /** Key completa recién creada — el backend solo la entrega una vez. */
  const createdKey = ref<string | null>(null)

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
    saving.value = true
    try {
      const body: AdminApiKeyCreateRequest = {
        name:      form.name,
        nodeId:    form.nodeId !== '' ? (form.nodeId as number) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }
      const res = await adminApi.createApiKey(body)
      apiKeys.value.push(toAdminApiKey(res.metadata))
      createdKey.value = res.apiKey
      return true
    } catch {
      return false
    } finally {
      saving.value = false
    }
  }

  async function revokeApiKey(id: number): Promise<boolean> {
    try {
      await adminApi.revokeApiKey(id)
      apiKeys.value = apiKeys.value.filter(k => k.id !== id)
      return true
    } catch {
      return false
    }
  }

  function clearCreatedKey() {
    createdKey.value = null
  }

  return { apiKeys, loading, error, saving, createdKey, fetchApiKeys, createApiKey, revokeApiKey, clearCreatedKey }
})
