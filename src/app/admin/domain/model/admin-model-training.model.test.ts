import { describe, expect, it } from 'vitest'
import { hasActiveRun, runStatus, runTriggerLabel } from './admin-model-training.model'

describe('runStatus', () => {
  it('distingue corridas en curso, exitosas y fallidas', () => {
    expect(runStatus({ status: 'in_progress', conclusion: null })).toEqual({ label: 'En curso', tone: 'warning' })
    expect(runStatus({ status: 'queued', conclusion: null }).label).toBe('En cola')
    expect(runStatus({ status: 'completed', conclusion: 'success' }).tone).toBe('success')
    expect(runStatus({ status: 'completed', conclusion: 'failure' })).toEqual({ label: 'Falló', tone: 'destructive' })
    expect(runStatus({ status: 'completed', conclusion: 'timed_out' }).tone).toBe('destructive')
    expect(runStatus({ status: 'completed', conclusion: 'cancelled' }).tone).toBe('neutral')
  })
})

describe('runTriggerLabel / hasActiveRun', () => {
  it('traduce el disparador y detecta corridas pendientes', () => {
    expect(runTriggerLabel('schedule')).toBe('Programada')
    expect(runTriggerLabel('workflow_dispatch')).toBe('A pedido')
    expect(hasActiveRun([{ status: 'completed' }, { status: 'queued' }])).toBe(true)
    expect(hasActiveRun([{ status: 'completed' }])).toBe(false)
  })
})
