import { describe, expect, it } from 'vitest'
import { auditQuery } from './admin-audit-api'
import { auditFiltersError, emptyAuditFilters } from '../application/admin-audit.store'
import { auditActionLabel } from '../domain/model/admin-audit.model'

describe('auditQuery', () => {
  it('sin filtros no manda nada más que la página', () => {
    expect(auditQuery(emptyAuditFilters(), { page: 2, size: 20 })).toBe('page=2&size=20')
  })

  it('el "hasta" inclusivo del formulario pasa a la medianoche del día siguiente', () => {
    const params = new URLSearchParams(auditQuery({ from: '2026-11-01', to: '2026-11-03', zoneId: 7, action: 'ZONE_DELETED' }))
    expect(params.get('from')).toBe(new Date(2026, 10, 1).toISOString())
    expect(params.get('to')).toBe(new Date(2026, 10, 4).toISOString())
    expect(params.get('zoneId')).toBe('7')
    expect(params.get('action')).toBe('ZONE_DELETED')
    expect(params.has('page')).toBe(false)
  })
})

describe('auditFiltersError', () => {
  it('rechaza un rango invertido', () => {
    expect(auditFiltersError({ ...emptyAuditFilters(), from: '2026-11-05', to: '2026-11-01' })).not.toBeNull()
    expect(auditFiltersError({ ...emptyAuditFilters(), from: '2026-11-01', to: '2026-11-01' })).toBeNull()
  })
})

describe('auditActionLabel', () => {
  it('traduce las acciones conocidas y deja las nuevas tal cual', () => {
    expect(auditActionLabel('USER_ROLE_CHANGED')).toBe('Rol de usuario cambiado')
    expect(auditActionLabel('ALGO_NUEVO')).toBe('ALGO_NUEVO')
  })
})
