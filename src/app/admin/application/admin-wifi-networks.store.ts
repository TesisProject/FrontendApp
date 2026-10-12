import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminWifiNetwork, AdminWifiNetworkForm } from '../domain/model/admin-wifi-network.model'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminWifiNetwork } from '../infrastructure/admin-assembler'
import { adminErrorMessage } from './admin-error-messages'

/**
 * Redes WiFi agrupadas por nodo. Se piden por nodo bajo demanda (la tabla de nodos, el selector de
 * red de una cámara): con pocos nodos son unas pocas peticiones en paralelo.
 */
export const useAdminWifiNetworksStore = defineStore('admin-wifi-networks', () => {
  const byNode   = ref<Record<number, AdminWifiNetwork[]>>({})
  const loading  = ref<Record<number, boolean>>({})
  const errors   = ref<Record<number, string | null>>({})
  const saving   = ref(false)
  const actionError = ref<string | null>(null)

  async function fetchNetworks(nodeId: number) {
    loading.value[nodeId] = true
    errors.value[nodeId]  = null
    try {
      const res = await adminApi.getWifiNetworks(nodeId)
      byNode.value[nodeId] = res.map(toAdminWifiNetwork)
    } catch {
      errors.value[nodeId] = 'No se pudieron cargar las redes WiFi'
    } finally {
      loading.value[nodeId] = false
    }
  }

  /** Pide las redes de los nodos que aún no se han cargado. */
  function ensureNetworks(nodeIds: Iterable<number>): Promise<unknown> {
    const missing = [...new Set(nodeIds)].filter(id => byNode.value[id] === undefined && !loading.value[id])
    return Promise.all(missing.map(fetchNetworks))
  }

  function networksOf(nodeId: number | null | ''): AdminWifiNetwork[] {
    return nodeId === null || nodeId === '' ? [] : byNode.value[nodeId] ?? []
  }

  function ssidOf(nodeId: number | null, networkId: number | null): string | null {
    if (nodeId === null || networkId === null) return null
    return networksOf(nodeId).find(n => n.id === networkId)?.ssid ?? null
  }

  async function createNetwork(nodeId: number, form: AdminWifiNetworkForm): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      const res = await adminApi.createWifiNetwork(nodeId, { ssid: form.ssid, password: form.password })
      byNode.value[nodeId] = [...networksOf(nodeId), toAdminWifiNetwork(res)]
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e)
      return false
    } finally {
      saving.value = false
    }
  }

  /** Contraseña vacía = conservar la actual: se envía `null`, nunca `""` (el backend la rechazaría). */
  async function updateNetwork(nodeId: number, networkId: number, form: AdminWifiNetworkForm): Promise<boolean> {
    saving.value      = true
    actionError.value = null
    try {
      const res = await adminApi.updateWifiNetwork(nodeId, networkId, {
        ssid:     form.ssid,
        password: form.password === '' ? null : form.password,
      })
      byNode.value[nodeId] = networksOf(nodeId).map(n => n.id === networkId ? toAdminWifiNetwork(res) : n)
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteNetwork(nodeId: number, networkId: number): Promise<boolean> {
    actionError.value = null
    try {
      await adminApi.deleteWifiNetwork(nodeId, networkId)
      byNode.value[nodeId] = networksOf(nodeId).filter(n => n.id !== networkId)
      return true
    } catch (e) {
      actionError.value = adminErrorMessage(e, 'No se pudo borrar la red')
      return false
    }
  }

  return {
    byNode, loading, errors, saving, actionError,
    fetchNetworks, ensureNetworks, networksOf, ssidOf,
    createNetwork, updateNetwork, deleteNetwork,
  }
})
