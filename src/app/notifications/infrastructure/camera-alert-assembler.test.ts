import { describe, expect, it } from 'vitest'
import { toCameraAlert, toInboxItem } from './camera-alert-assembler'
import { alertStatus, alertTypeLabel } from '../domain/model/camera-alert.model'
import type { CameraAlertResponse } from './camera-alert-response'

const base: CameraAlertResponse = {
  id: 1, cameraId: 7, cameraCode: 'CAM-002', cameraName: 'Entrada', zoneId: 3, zoneName: 'Sótano A',
  alertType: 'CAMERA_OFFLINE', severity: 'HIGH',
  detectedAt: '2026-11-04T15:00:00Z', lastFrameAt: '2026-11-04T14:58:00Z', secondAlertSentAt: null,
  acknowledgedBy: null, acknowledgedAt: null, resolvedAt: null, resolutionNote: null,
  createdAt: '2026-11-04T15:00:00Z',
}

describe('toCameraAlert', () => {
  it('arma la etiqueta con código, nombre de cámara y zona', () => {
    const a = toCameraAlert(base)
    expect(a.cameraLabel).toBe('CAM-002 (Entrada)')
    expect(a.zoneLabel).toBe('Sótano A')
    expect(a.lastFrameAt).toBe('2026-11-04T14:58:00Z')
  })

  it('usa el id cuando la cámara o la zona ya no existen', () => {
    const a = toCameraAlert({ ...base, cameraCode: null, cameraName: null, zoneName: null })
    expect(a.cameraLabel).toBe('Cámara 7')
    expect(a.zoneLabel).toBe('Zona 3')
  })

  it('sin nombre de cámara deja solo el código', () => {
    expect(toCameraAlert({ ...base, cameraName: null }).cameraLabel).toBe('CAM-002')
  })

  it('mapea un aviso de la campana', () => {
    const item = toInboxItem({ notificationId: 9, sentAt: '2026-11-04T15:00:01Z', read: false, alert: base })
    expect(item.notificationId).toBe(9)
    expect(item.alert.id).toBe(1)
  })
})

describe('alertStatus', () => {
  it('abierta, reconocida y resuelta', () => {
    expect(alertStatus(toCameraAlert(base))).toBe('open')
    expect(alertStatus(toCameraAlert({ ...base, acknowledgedAt: '2026-11-04T15:01:00Z' }))).toBe('acknowledged')
    expect(alertStatus(toCameraAlert({ ...base, acknowledgedAt: 'x', resolvedAt: 'y' }))).toBe('resolved')
  })

  it('traduce el tipo', () => {
    expect(alertTypeLabel('CAMERA_OFFLINE')).toBe('Cámara sin señal')
    expect(alertTypeLabel('OTRO')).toBe('OTRO')
  })
})
