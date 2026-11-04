import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AuditEntry, AuditFilters } from '../domain/model/admin-audit.model'
import { adminAuditApi } from '../infrastructure/admin-audit-api'
import { adminErrorMessage } from './admin-error-messages'

export const AUDIT_PAGE_SIZE = 20

export function emptyAuditFilters(): AuditFilters {
  return { from: '', to: '', zoneId: '', action: '' }
}

/** Mensaje si el rango de fechas no tiene sentido; el backend lo rechazaría con INVALID_AUDIT_QUERY. */
export function auditFiltersError(filters: AuditFilters): string | null {
  if (filters.from && filters.to && filters.to < filters.from) {
    return 'La fecha "hasta" no puede ser anterior a la fecha "desde"'
  }
  return null
}

/** Log de auditoría del panel (HU-25): filtros, página actual y exportación a CSV. */
export const useAdminAuditStore = defineStore('admin-audit', () => {
  const entries       = ref<AuditEntry[]>([])
  const totalElements = ref(0)
  const page          = ref(0)
  const loading       = ref(false)
  const exporting     = ref(false)
  const error         = ref<string | null>(null)
  /** Filtros con los que se cargó la página actual (el export usa los mismos). */
  const applied       = ref<AuditFilters>(emptyAuditFilters())

  async function search(filters: AuditFilters, toPage = 0) {
    const invalid = auditFiltersError(filters)
    if (invalid) {
      error.value = invalid
      return
    }
    loading.value = true
    error.value   = null
    try {
      const res = await adminAuditApi.getLogs(filters, toPage, AUDIT_PAGE_SIZE)
      entries.value       = res.items
      totalElements.value = res.totalElements
      page.value          = res.page
      applied.value       = { ...filters }
    } catch (err) {
      error.value = adminErrorMessage(err, 'No se pudo cargar el log de auditoría')
    } finally {
      loading.value = false
    }
  }

  function goToPage(toPage: number) {
    return search(applied.value, toPage)
  }

  /** Descarga el CSV de los filtros aplicados. Devuelve el mensaje de error, o `null` si salió bien. */
  async function exportCsv(): Promise<string | null> {
    exporting.value = true
    try {
      const blob = await adminAuditApi.exportCsv(applied.value)
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: 'auditoria.csv' })
      a.click()
      URL.revokeObjectURL(url)
      return null
    } catch (err) {
      return adminErrorMessage(err, 'No se pudo exportar el log')
    } finally {
      exporting.value = false
    }
  }

  return { entries, totalElements, page, loading, exporting, error, applied, search, goToPage, exportCsv }
})
