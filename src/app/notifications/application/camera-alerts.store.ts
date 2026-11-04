import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { CameraAlertApi } from '../infrastructure/camera-alert-api'
import { toCameraAlert, toInboxItem } from '../infrastructure/camera-alert-assembler'
import type { CameraAlert, CameraAlertInboxItem } from '../domain/model/camera-alert.model'
import { alertStatus } from '../domain/model/camera-alert.model'
import { cameraAlertErrorMessage } from './camera-alert-error-messages'

const api = new CameraAlertApi()

/** Cada cuánto refresca la campana: el vigilante del backend revisa las cámaras cada 60 s. */
export const INBOX_POLL_MS = 30_000

/**
 * Alertas de cámara del panel (HU-17): la lista completa para la vista "Alertas" y la campana con los
 * avisos no leídos del usuario, que se refresca sola mientras el panel está abierto.
 */
export const useCameraAlertsStore = defineStore('camera-alerts', () => {
  const alerts      = ref<CameraAlert[]>([])
  const inbox       = ref<CameraAlertInboxItem[]>([])
  const loading     = ref(false)
  const error       = ref<string | null>(null)
  const actionError = ref<string | null>(null)
  const busyId      = ref<number | null>(null)

  const unreadCount = computed(() => inbox.value.length)
  const openCount   = computed(() => alerts.value.filter(a => alertStatus(a) !== 'resolved').length)
  /** Ids de alertas con un aviso no leído del usuario: se resaltan en la lista. */
  const unreadAlertIds = computed(() => new Set(inbox.value.map(i => i.alert.id)))

  let timer: ReturnType<typeof setInterval> | null = null

  async function fetchAlerts() {
    loading.value = true
    error.value   = null
    try {
      alerts.value = (await api.getAll()).map(toCameraAlert)
    } catch (err) {
      error.value = cameraAlertErrorMessage(err, 'No se pudieron cargar las alertas')
    } finally {
      loading.value = false
    }
  }

  /** La campana. Un fallo no borra lo que ya se mostraba: se reintenta en el siguiente ciclo. */
  async function fetchInbox() {
    try {
      inbox.value = (await api.getMine()).map(toInboxItem)
    } catch {
      /* silencioso: el contador no debe llenar la pantalla de errores si la red parpadea */
    }
  }

  function startInboxPolling(intervalMs = INBOX_POLL_MS) {
    stopInboxPolling()
    void fetchInbox()
    timer = setInterval(() => { void fetchInbox() }, intervalMs)
  }

  function stopInboxPolling() {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  async function run(alertId: number | null, action: () => Promise<void>): Promise<boolean> {
    busyId.value      = alertId
    actionError.value = null
    try {
      await action()
      await Promise.all([fetchAlerts(), fetchInbox()])
      return true
    } catch (err) {
      actionError.value = cameraAlertErrorMessage(err)
      return false
    } finally {
      busyId.value = null
    }
  }

  const acknowledge = (alertId: number) => run(alertId, () => api.acknowledge(alertId))
  const resolve     = (alertId: number, note: string) => run(alertId, () => api.resolve(alertId, note))
  const markRead    = (notificationId: number) => run(null, () => api.markMineRead(notificationId))
  const markAllRead = () => run(null, () => api.markAllMineRead())

  return {
    alerts, inbox, loading, error, actionError, busyId,
    unreadCount, openCount, unreadAlertIds,
    fetchAlerts, fetchInbox, startInboxPolling, stopInboxPolling,
    acknowledge, resolve, markRead, markAllRead,
  }
})
