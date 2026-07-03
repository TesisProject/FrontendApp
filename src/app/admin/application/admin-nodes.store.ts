import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminNode, AdminNodeForm } from '../domain/model/admin-node.model'
import type { AdminNodeCreateRequest, AdminNodeUpdateRequest } from '../infrastructure/admin-response'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminNode } from '../infrastructure/admin-assembler'

export const useAdminNodesStore = defineStore('admin-nodes', () => {
  const nodes   = ref<AdminNode[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)
  const saving  = ref(false)

  async function fetchNodes() {
    loading.value = true
    error.value   = null
    try {
      const res = await adminApi.getNodes()
      nodes.value = res.map(toAdminNode)
    } catch {
      error.value = 'No se pudieron cargar los nodos'
    } finally {
      loading.value = false
    }
  }

  async function createNode(form: AdminNodeForm): Promise<boolean> {
    saving.value = true
    try {
      const body: AdminNodeCreateRequest = {
        code:     form.code,
        name:     form.name || undefined,
        location: form.location || undefined,
      }
      const res = await adminApi.createNode(body)
      nodes.value.push(toAdminNode(res))
      return true
    } catch {
      return false
    } finally {
      saving.value = false
    }
  }

  async function updateNode(id: number, form: AdminNodeForm): Promise<boolean> {
    saving.value = true
    try {
      const body: AdminNodeUpdateRequest = {
        name:     form.name || undefined,
        location: form.location || undefined,
        active:   form.active,
      }
      const res = await adminApi.updateNode(id, body)
      const idx = nodes.value.findIndex(n => n.id === id)
      if (idx !== -1) nodes.value[idx] = toAdminNode(res)
      return true
    } catch {
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteNode(id: number): Promise<boolean> {
    try {
      await adminApi.deleteNode(id)
      nodes.value = nodes.value.filter(n => n.id !== id)
      return true
    } catch {
      return false
    }
  }

  return { nodes, loading, error, saving, fetchNodes, createNode, updateNode, deleteNode }
})
