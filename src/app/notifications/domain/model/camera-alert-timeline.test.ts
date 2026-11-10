import { describe, expect, it } from 'vitest'
import { alertTimeline, type CameraAlert } from './camera-alert.model'

const base: CameraAlert = {
  id: 1, cameraId: 2, cameraLabel: 'CAM-001', zoneId: 3, zoneLabel: 'Zona 3',
  type: 'CAMERA_OFFLINE', severity: 'HIGH',
  detectedAt: '2026-11-10T10:00:00Z', lastFrameAt: '2026-11-10T09:58:30Z',
  secondAlertSentAt: null, acknowledgedBy: null, acknowledgedAt: null, resolvedAt: null, resolutionNote: null,
}

describe('alertTimeline', () => {
  it('una alerta recién abierta solo tiene el paso detectada', () => {
    expect(alertTimeline(base).map(s => s.key)).toEqual(['detected'])
  })

  it('ordena los pasos por hora: detectada, 2.º aviso, reconocida, resuelta', () => {
    const steps = alertTimeline({
      ...base,
      secondAlertSentAt: '2026-11-10T10:05:00Z',
      acknowledgedAt: '2026-11-10T10:07:00Z',
      resolvedAt: '2026-11-10T10:20:00Z',
    })
    expect(steps.map(s => s.key)).toEqual(['detected', 'second-alert', 'acknowledged', 'resolved'])
  })

  it('respeta el orden real si se reconoció antes del 2.º aviso', () => {
    const steps = alertTimeline({ ...base, acknowledgedAt: '2026-11-10T10:01:00Z', secondAlertSentAt: '2026-11-10T10:05:00Z' })
    expect(steps.map(s => s.key)).toEqual(['detected', 'acknowledged', 'second-alert'])
  })
})
