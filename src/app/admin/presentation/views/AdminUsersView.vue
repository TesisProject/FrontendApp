<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminUsersStore } from '../../application/admin-users.store'
import { adminApi } from '../../infrastructure/admin-api'
import type { AdminRole } from '../../domain/model/admin-user.model'

const store  = useAdminUsersStore()
const search = ref('')
const activeFilter = ref<AdminRole | 'TODOS'>('TODOS')

const roles: AdminRole[] = ['ADMIN', 'OPERATOR', 'USER']
const roleLabel: Record<AdminRole, string> = { ADMIN: 'Administrador', OPERATOR: 'Operador', USER: 'Usuario' }
const roleColor: Record<AdminRole, string> = { ADMIN: '#e53e3e', OPERATOR: '#f2894a', USER: '#3182ce' }

const filtered = computed(() =>
  store.users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.value.toLowerCase())
    const matchFilter = activeFilter.value === 'TODOS' || u.role === activeFilter.value
    return matchSearch && matchFilter
  })
)

const roleCounts = computed(() => ({
  TODOS:    store.users.length,
  ADMIN:    store.users.filter(u => u.role === 'ADMIN').length,
  OPERATOR: store.users.filter(u => u.role === 'OPERATOR').length,
  USER:     store.users.filter(u => u.role === 'USER').length,
}))

// ── Role confirm ──────────────────────────────────────────
const pendingRole = ref<{ id: number; currentRole: AdminRole; newRole: AdminRole } | null>(null)

function requestRoleChange(id: number, currentRole: AdminRole, newRole: AdminRole) {
  if (newRole === currentRole) return
  pendingRole.value = { id, currentRole, newRole }
}

async function confirmRoleChange() {
  if (!pendingRole.value) return
  await store.updateRole(pendingRole.value.id, pendingRole.value.newRole)
  pendingRole.value = null
}

function cancelRoleChange() {
  pendingRole.value = null
}

// ── Status confirm ────────────────────────────────────────
const pendingStatus = ref<{ id: number; current: boolean } | null>(null)

function requestStatusToggle(id: number, current: boolean) {
  pendingStatus.value = { id, current }
}

async function confirmStatusToggle() {
  if (!pendingStatus.value) return
  await store.toggleStatus(pendingStatus.value.id, !pendingStatus.value.current)
  pendingStatus.value = null
}

// ── Edit profile modal ────────────────────────────────────
const showEdit    = ref(false)
const editUserId  = ref<number | null>(null)
const editEmail   = ref('')
const editForm    = ref({ firstName: '', lastName: '', phone: '' })
const editLoading = ref(false)
const editSaving  = ref(false)
const editMsg     = ref<{ ok: boolean; text: string } | null>(null)

async function openEdit(id: number, email: string) {
  editUserId.value = id
  editEmail.value  = email
  editForm.value   = { firstName: '', lastName: '', phone: '' }
  editMsg.value    = null
  showEdit.value   = true
  editLoading.value = true
  try {
    const profile = await adminApi.getUserProfile(id)
    editForm.value = {
      firstName: profile.firstName ?? '',
      lastName:  profile.lastName  ?? '',
      phone:     profile.phone     ?? '',
    }
  } finally {
    editLoading.value = false
  }
}

function closeEdit() { showEdit.value = false }

async function saveProfile() {
  if (!editUserId.value) return
  editSaving.value = true
  editMsg.value    = null
  try {
    await adminApi.updateUserProfile(editUserId.value, editForm.value)
    editMsg.value = { ok: true, text: 'Perfil actualizado correctamente' }
    setTimeout(closeEdit, 900)
  } catch {
    editMsg.value = { ok: false, text: 'Error al guardar, intenta de nuevo' }
  } finally {
    editSaving.value = false
  }
}

onMounted(() => store.fetchUsers())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Usuarios</h1>
        <p class="page-sub">{{ store.users.length }} usuarios registrados</p>
      </div>
    </div>

    <!-- Role filter pills -->
    <div class="filter-pills">
      <button
        v-for="f in (['TODOS', ...roles] as const)"
        :key="f"
        class="pill"
        :class="{ active: activeFilter === f }"
        @click="activeFilter = f"
      >
        {{ f === 'TODOS' ? 'Todos' : roleLabel[f] }}
        <span class="pill-count">{{ roleCounts[f] }}</span>
      </button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input v-model="search" type="text" placeholder="Buscar por email..." />
    </div>

    <div v-if="store.loading" class="state-box">Cargando usuarios...</div>
    <div v-else-if="store.error" class="state-box error">{{ store.error }}</div>

    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="5" class="empty-row">No se encontraron usuarios</td>
          </tr>
          <tr v-for="u in filtered" :key="u.id">
            <td class="td-id">#{{ u.id }}</td>
            <td class="td-name">{{ u.email }}</td>
            <td>
              <select
                :value="u.role"
                class="role-select"
                :style="{ borderColor: roleColor[u.role], color: roleColor[u.role] }"
                @change="requestRoleChange(u.id, u.role, ($event.target as HTMLSelectElement).value as AdminRole)"
              >
                <option v-for="r in roles" :key="r" :value="r">{{ roleLabel[r] }}</option>
              </select>
            </td>
            <td>
              <button
                class="status-toggle"
                :class="u.active ? 'active' : 'inactive'"
                @click="requestStatusToggle(u.id, u.active)"
              >
                {{ u.active ? 'Activo' : 'Inactivo' }}
              </button>
            </td>
            <td>
              <button class="action-btn edit" @click="openEdit(u.id, u.email)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Confirm role change -->
    <Transition name="modal">
      <div v-if="pendingRole" class="overlay" @click.self="cancelRoleChange">
        <div class="confirm-box">
          <p class="confirm-text">
            ¿Cambiar el rol de este usuario de
            <strong>{{ roleLabel[pendingRole.currentRole] }}</strong> a
            <strong>{{ roleLabel[pendingRole.newRole] }}</strong>?
          </p>
          <div class="confirm-actions">
            <button class="btn-ghost"    @click="cancelRoleChange">Cancelar</button>
            <button class="btn-primary"  @click="confirmRoleChange">Confirmar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Confirm status toggle -->
    <Transition name="modal">
      <div v-if="pendingStatus" class="overlay" @click.self="pendingStatus = null">
        <div class="confirm-box">
          <p class="confirm-text">
            ¿{{ pendingStatus.current ? 'Desactivar' : 'Activar' }} este usuario?
          </p>
          <div class="confirm-actions">
            <button class="btn-ghost"  @click="pendingStatus = null">Cancelar</button>
            <button class="btn-primary" @click="confirmStatusToggle">Confirmar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Edit profile modal -->
    <Transition name="modal">
      <div v-if="showEdit" class="overlay" @click.self="closeEdit">
        <div class="modal">
          <h2 class="modal-title">Editar perfil</h2>
          <p class="edit-email">{{ editEmail }}</p>

          <div v-if="editLoading" class="state-box">Cargando perfil...</div>
          <template v-else>
            <div class="form-row">
              <div class="form-group">
                <label>Nombre</label>
                <input v-model="editForm.firstName" type="text" placeholder="Juan" />
              </div>
              <div class="form-group">
                <label>Apellido</label>
                <input v-model="editForm.lastName" type="text" placeholder="Pérez" />
              </div>
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input v-model="editForm.phone" type="text" placeholder="+51 999 000 111" />
            </div>

            <p v-if="editMsg" class="feedback" :class="editMsg.ok ? 'ok' : 'err'">{{ editMsg.text }}</p>

            <div class="modal-actions">
              <button class="btn-ghost"    @click="closeEdit">Cancelar</button>
              <button class="btn-primary" :disabled="editSaving" @click="saveProfile">
                {{ editSaving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import '../styles/admin-shared.css';

/* Filter pills */
.filter-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid #e0e0e0;
  background: white;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.pill:hover { border-color: #092c4c; color: #092c4c; }
.pill.active { background: #092c4c; border-color: #092c4c; color: white; }

.pill-count {
  background: rgba(0,0,0,0.1);
  border-radius: 8px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 700;
}
.pill.active .pill-count { background: rgba(255,255,255,0.25); }

/* Role select */
.role-select {
  padding: 4px 8px;
  border-radius: 6px;
  border-width: 1.5px;
  border-style: solid;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  background: white;
  cursor: pointer;
  outline: none;
}

/* Status toggle */
.status-toggle {
  padding: 4px 12px;
  border-radius: 12px;
  border: none;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.2s;
}
.status-toggle.active   { background: #f0fff4; color: #38a169; }
.status-toggle.inactive { background: #fff5f5; color: #e53e3e; }
.status-toggle:hover { opacity: 0.75; }

/* Edit email label */
.edit-email {
  font-size: 13px;
  color: #888;
  margin: -8px 0 4px;
}

/* Transitions */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .modal,
.modal-enter-active .confirm-box { transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease; }
.modal-leave-active .modal,
.modal-leave-active .confirm-box { transition: transform 0.15s ease, opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal,
.modal-enter-from .confirm-box { transform: translateY(20px) scale(0.97); opacity: 0; }
.modal-leave-to .modal,
.modal-leave-to .confirm-box { transform: translateY(8px) scale(0.98); opacity: 0; }
</style>
