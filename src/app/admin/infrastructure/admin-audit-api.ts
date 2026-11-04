import { httpClient } from '../../shared/infrastructure/http-client'
import type { AuditFilters, AuditPage } from '../domain/model/admin-audit.model'

/** Medianoche local de `YYYY-MM-DD` como instante ISO (con la zona del navegador). */
function startOfLocalDay(date: string, plusDays = 0): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d! + plusDays).toISOString()
}

/**
 * Query string de `GET /audit/logs` y de su export. `to` del formulario es inclusivo y el del backend
 * exclusivo: se manda la medianoche del día siguiente.
 */
export function auditQuery(filters: AuditFilters, page?: { page: number; size: number }): string {
  const params = new URLSearchParams()
  if (filters.from)          params.set('from', startOfLocalDay(filters.from))
  if (filters.to)            params.set('to', startOfLocalDay(filters.to, 1))
  if (filters.zoneId !== '') params.set('zoneId', String(filters.zoneId))
  if (filters.action)        params.set('action', filters.action)
  if (page) {
    params.set('page', String(page.page))
    params.set('size', String(page.size))
  }
  return params.toString()
}

const BOM = '﻿'

export const adminAuditApi = {
  /** `GET /api/v1/audit/logs` (ADMIN): orden descendente por fecha, paginado. */
  getLogs(filters: AuditFilters, page: number, size: number): Promise<AuditPage> {
    return httpClient.get(`/audit/logs?${auditQuery(filters, { page, size })}`)
  },

  /**
   * `GET /api/v1/audit/logs/export.csv` con los mismos filtros, como Blob listo para descargar.
   * El cliente HTTP devuelve el texto tal cual (no es JSON); se asegura el BOM para que Excel lea
   * bien los acentos.
   */
  async exportCsv(filters: AuditFilters): Promise<Blob> {
    const query = auditQuery(filters)
    const text = await httpClient.get<string>(`/audit/logs/export.csv${query ? `?${query}` : ''}`)
    const csv = typeof text === 'string' ? text : String(text)
    return new Blob([csv.startsWith(BOM) ? csv : BOM + csv], { type: 'text/csv;charset=utf-8' })
  },
}
