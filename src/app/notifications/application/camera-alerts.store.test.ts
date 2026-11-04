import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CameraAlertResponse } from '../infrastructure/camera-alert-response'

const api = vi.hoisted(() => ({
  getAll:          vi.fn(),
  getMine:         vi.fn(),
  markMineRead:    vi.fn(),
  markAllMineRead: vi.fn(),
  acknowledge:     vi.fn(),
  resolve:         vi.fn(),
}))

vi.mock('../infrastructure/camera-alert-api', () => ({
  CameraAlertApi: class { constructor() { return api } },
}))

import { useCameraAlertsStore } from './camera-alerts.store'

const alert = (id: number, extra: Partial<CameraAlertResponse> = {}): CameraAlertResponse => ({
  id, cameraId: 7, cameraCode: 'CAM-002', cameraName: null, zoneId: 3, zoneName: 'Sótano A',
  alertType: 'CAMERA_OFFLINE', severity: 'HIGH', detectedAt: '2026-11-04T15:00:00Z',
  lastFrameAt: '2026-11-04T14:58:00Z', secondAlertSentAt: null, acknowledgedBy: null,
  acknowledgedAt: null, resolvedAt: null, resolutionNote: null, createdAt: null, ...extra,
})

describe('useCameraAlertsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(api).forEach(fn => fn.mockReset())
    api.getAll.mockResolvedValue([alert(1), alert(2, { resolvedAt: '2026-11-04T15:05:00Z' })])
    api.getMine.mockResolvedValue([{ notificationId: 9, sentAt: '2026-11-04T15:00:01Z', read: false, alert: alert(1) }])
  })

  it('cuenta las abiertas y los avisos sin leer', async () => {
    const store = useCameraAlertsStore()
    await Promise.all([store.fetchAlerts(), store.fetchInbox()])

    expect(store.openCount).toBe(1)
    expect(store.unreadCount).toBe(1)
    expect(store.unreadAlertIds.has(1)).toBe(true)
  })

  it('reconocer llama al backend y recarga lista y campana', async () => {
    api.acknowledge.mockResolvedValue(undefined)
    const store = useCameraAlertsStore()

    expect(await store.acknowledge(1)).toBe(true)
    expect(api.acknowledge).toHaveBeenCalledWith(1)
    expect(api.getAll).toHaveBeenCalled()
    expect(api.getMine).toHaveBeenCalled()
  })

  it('resolver ya resuelta muestra el mensaje del código', async () => {
    api.resolve.mockRejectedValue({ status: 409, error: 'CAMERA_ALERT_ALREADY_RESOLVED' })
    const store = useCameraAlertsStore()

    expect(await store.resolve(1, 'Cambiada la batería')).toBe(false)
    expect(api.resolve).toHaveBeenCalledWith(1, 'Cambiada la batería')
    expect(store.actionError).toContain('ya estaba resuelta')
  })

  it('un fallo de la campana conserva el contador anterior', async () => {
    const store = useCameraAlertsStore()
    await store.fetchInbox()
    api.getMine.mockRejectedValue(new Error('red'))

    await store.fetchInbox()

    expect(store.unreadCount).toBe(1)
  })

  it('el polling refresca la campana cada intervalo y se detiene', async () => {
    vi.useFakeTimers()
    const store = useCameraAlertsStore()

    store.startInboxPolling(1000)
    await vi.advanceTimersByTimeAsync(2500)
    store.stopInboxPolling()
    await vi.advanceTimersByTimeAsync(5000)

    expect(api.getMine).toHaveBeenCalledTimes(3)   // al arrancar + 2 ticks
    vi.useRealTimers()
  })

  it('error al cargar la lista', async () => {
    api.getAll.mockRejectedValue({ status: 403, error: 'ACCESS_DENIED' })
    const store = useCameraAlertsStore()

    await store.fetchAlerts()

    expect(store.error).toBe('No tienes permiso para esta acción')
  })
})
