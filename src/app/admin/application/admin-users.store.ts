import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminUser, AdminRole } from '../domain/model/admin-user.model'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminUser } from '../infrastructure/admin-assembler'
import { adminErrorMessage } from './admin-error-messages'

/** Filtros del listado de usuarios (HU-24): texto en nombre o correo, y rol exacto. */
export interface AdminUserFilters {
  q?:    string
  role?: AdminRole
}

export const useAdminUsersStore = defineStore('admin-users', () => {
  const users   = ref<AdminUser[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)
  const saving  = ref(false)
  /** Mensaje en español del último cambio de rol o de estado rechazado (p. ej. LAST_ACTIVE_ADMIN). */
  const actionError = ref<string | null>(null)
  /** Administradores activos en todo el sistema (no solo en la búsqueda); `null` si no se pudo contar. */
  const activeAdminCount = ref<number | null>(null)
  /** Último pedido de búsqueda: una respuesta vieja no pisa la de una búsqueda más reciente. */
  let lastRequest = 0

  /** Busca en el backend por nombre, correo o rol (`GET /iam/users?q=&role=`). */
  async function fetchUsers(filters: AdminUserFilters = {}) {
    const request = ++lastRequest
    loading.value = true
    error.value   = null
    try {
      const res = await adminApi.getUsers(filters)
      if (request === lastRequest) users.value = res.map(toAdminUser)
    } catch (err) {
      if (request === lastRequest) error.value = adminErrorMessage(err, 'No se pudieron cargar los usuarios')
    } finally {
      if (request === lastRequest) loading.value = false
    }
  }

  /** Cuenta los ADMIN activos para avisar antes de tocar al último (el backend igual lo bloquea). */
  async function refreshActiveAdminCount() {
    try {
      const admins = await adminApi.getUsers({ role: 'ADMIN' })
      activeAdminCount.value = admins.filter(a => a.isActive).length
    } catch {
      activeAdminCount.value = null
    }
  }

  /** `true` si el usuario es el único ADMIN activo: desactivarlo o degradarlo será rechazado. */
  function isLastActiveAdmin(user: AdminUser): boolean {
    return user.role === 'ADMIN' && user.active && activeAdminCount.value === 1
  }

  function replaceUser(updated: AdminUser) {
    const idx = users.value.findIndex(u => u.id === updated.id)
    // La respuesta de rol/estado no trae el nombre: se conserva el del listado.
    if (idx !== -1) users.value[idx] = { ...updated, fullName: updated.fullName ?? users.value[idx]!.fullName }
  }

  async function updateRole(id: number, role: AdminRole): Promise<boolean> {
    saving.value = true
    actionError.value = null
    try {
      replaceUser(toAdminUser(await adminApi.updateUserRole(id, role)))
      void refreshActiveAdminCount()
      return true
    } catch (err) {
      actionError.value = adminErrorMessage(err, 'No se pudo cambiar el rol')
      return false
    } finally {
      saving.value = false
    }
  }

  async function toggleStatus(id: number, active: boolean): Promise<boolean> {
    saving.value = true
    actionError.value = null
    try {
      replaceUser(toAdminUser(await adminApi.toggleUserStatus(id, active)))
      void refreshActiveAdminCount()
      return true
    } catch (err) {
      actionError.value = adminErrorMessage(err, active ? 'No se pudo activar al usuario' : 'No se pudo desactivar al usuario')
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    users, loading, error, saving, actionError, activeAdminCount,
    fetchUsers, refreshActiveAdminCount, isLastActiveAdmin, updateRole, toggleStatus,
  }
})
