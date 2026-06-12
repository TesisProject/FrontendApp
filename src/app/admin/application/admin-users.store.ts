import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminUser, AdminRole } from '../domain/model/admin-user.model'
import { adminApi } from '../infrastructure/admin-api'
import { toAdminUser } from '../infrastructure/admin-assembler'

export const useAdminUsersStore = defineStore('admin-users', () => {
  const users   = ref<AdminUser[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)
  const saving  = ref(false)

  async function fetchUsers() {
    loading.value = true
    error.value   = null
    try {
      const res = await adminApi.getUsers()
      users.value = res.map(toAdminUser)
    } catch {
      error.value = 'No se pudieron cargar los usuarios'
    } finally {
      loading.value = false
    }
  }

  async function updateRole(id: number, role: AdminRole): Promise<boolean> {
    saving.value = true
    try {
      const res = await adminApi.updateUserRole(id, role)
      const idx = users.value.findIndex(u => u.id === id)
      if (idx !== -1) users.value[idx] = toAdminUser(res)
      return true
    } catch {
      return false
    } finally {
      saving.value = false
    }
  }

  async function toggleStatus(id: number, active: boolean): Promise<boolean> {
    try {
      const res = await adminApi.toggleUserStatus(id, active)
      const idx = users.value.findIndex(u => u.id === id)
      if (idx !== -1) users.value[idx] = toAdminUser(res)
      return true
    } catch {
      return false
    }
  }

  return { users, loading, error, saving, fetchUsers, updateRole, toggleStatus }
})
