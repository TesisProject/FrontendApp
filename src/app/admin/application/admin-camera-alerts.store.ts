import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminApi } from '../infrastructure/admin-api'
import { alertStatus } from '../domain/model/admin-camera-alert.model'
import type { AdminCameraAlert } from '../domain/model/admin-camera-alert.model'

export const useAdminCameraAlertsStore = defineStore('adminCameraAlerts', () => {
  const alerts  = ref<AdminCameraAlert[]>([])
  const loading = ref(false)
  const acting  = ref(false)
  const error   = ref<string | null>(null)

  const pending      = computed(() => alerts.value.filter(a => alertStatus(a) === 'PENDING'))
  const acknowledged = computed(() => alerts.value.filter(a => alertStatus(a) === 'ACKNOWLEDGED'))
  const resolved     = computed(() => alerts.value.filter(a => alertStatus(a) === 'RESOLVED'))

  async function fetchAlerts() {
    loading.value = true
    error.value   = null
    try {
      alerts.value = await adminApi.getCameraAlerts()
    } catch {
      error.value = 'No se pudieron cargar las alertas'
    } finally {
      loading.value = false
    }
  }

  async function acknowledge(alertId: number, userId: number) {
    acting.value = true
    try {
      await adminApi.acknowledgeAlert(alertId, userId)
      await fetchAlerts()
    } catch {
      error.value = 'Error al reconocer la alerta'
    } finally {
      acting.value = false
    }
  }

  async function resolve(alertId: number, note: string) {
    acting.value = true
    try {
      await adminApi.resolveAlert(alertId, note)
      await fetchAlerts()
    } catch {
      error.value = 'Error al resolver la alerta'
    } finally {
      acting.value = false
    }
  }

  return { alerts, loading, acting, error, pending, acknowledged, resolved, fetchAlerts, acknowledge, resolve }
})
