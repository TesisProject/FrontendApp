import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminZone, AdminZoneForm } from '../domain/model/admin-zone.model'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminZone } from '../infrastructure/admin-assembler'

export const useAdminZonesStore = defineStore('admin-zones', () => {
  const zones   = ref<AdminZone[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)
  const saving  = ref(false)

  async function fetchZones() {
    loading.value = true
    error.value   = null
    try {
      const res = await adminApi.getZones()
      zones.value = res.map(toAdminZone)
    } catch {
      error.value = 'No se pudieron cargar las zonas'
    } finally {
      loading.value = false
    }
  }

  async function createZone(form: AdminZoneForm): Promise<boolean> {
    saving.value = true
    try {
      console.log('[AdminZones] createZone payload:', JSON.stringify(form))
      const res = await adminApi.createZone(form)
      zones.value.push(toAdminZone(res))
      return true
    } catch (e) {
      console.error('[AdminZones] createZone error:', e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function updateZone(id: number, form: AdminZoneForm): Promise<boolean> {
    saving.value = true
    try {
      const res = await adminApi.updateZone(id, form)
      const idx = zones.value.findIndex(z => z.id === id)
      if (idx !== -1) zones.value[idx] = toAdminZone(res)
      return true
    } catch {
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteZone(id: number): Promise<boolean> {
    try {
      await adminApi.deleteZone(id)
      zones.value = zones.value.filter(z => z.id !== id)
      return true
    } catch {
      return false
    }
  }

  return { zones, loading, error, saving, fetchZones, createZone, updateZone, deleteZone }
})
