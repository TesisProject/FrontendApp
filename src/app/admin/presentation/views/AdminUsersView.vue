<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminUsersStore } from '../../application/admin-users.store'
import { adminApi } from '../../infrastructure/admin-api'
import type { AdminRole } from '../../domain/model/admin-user.model'
import { toast } from 'vue-sonner'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/shared/presentation/components/ui/dialog'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminPage from '../components/AdminPage.vue'
import AdminSearch from '../components/AdminSearch.vue'
import AdminStateBox from '../components/AdminStateBox.vue'
import AdminTableCard from '../components/AdminTableCard.vue'
import AdminField from '../components/AdminField.vue'
import FilterPills from '../../../shared/presentation/components/FilterPills.vue'

const store  = useAdminUsersStore()
const search = ref('')
const activeFilter = ref<AdminRole | 'TODOS'>('TODOS')

const roles: AdminRole[] = ['ADMIN', 'OPERATOR', 'USER']
const roleLabel: Record<AdminRole, string> = { ADMIN: 'Administrador', OPERATOR: 'Operador', USER: 'Usuario' }
const roleClass: Record<AdminRole, string> = {
  ADMIN:    'border-destructive text-destructive',
  OPERATOR: 'border-(--pv-amber) text-(--pv-amber-text)',
  USER:     'border-[#3182ce] text-[#2b6cb0]',
}

// La búsqueda la hace el backend (HU-24): nombre o correo en `q`, y el rol elegido.
const filtered = computed(() => store.users)

const roleFilters = computed(() => [
  { value: 'TODOS' as const, label: 'Todos' },
  ...roles.map(r => ({ value: r, label: roleLabel[r] })),
])

function load() {
  return store.fetchUsers({
    q:    search.value,
    role: activeFilter.value === 'TODOS' ? undefined : activeFilter.value,
  })
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
})
watch(activeFilter, () => { void load() })

const isFiltering = computed(() => search.value.trim() !== '' || activeFilter.value !== 'TODOS')

function userById(id: number) {
  return store.users.find(u => u.id === id)
}

/** Aviso del último administrador activo (el backend igual lo bloquea con LAST_ACTIVE_ADMIN). */
const LAST_ADMIN_NOTICE = 'Es el último administrador activo del sistema: no se puede desactivar ni quitarle el rol de administrador. Primero activa o asigna otro administrador.'

// ── Role confirm ──────────────────────────────────────────
const pendingRole = ref<{ id: number; currentRole: AdminRole; newRole: AdminRole } | null>(null)

function requestRoleChange(id: number, currentRole: AdminRole, newRole: AdminRole) {
  if (newRole === currentRole) return
  pendingRole.value = { id, currentRole, newRole }
}

const roleError = ref<string | null>(null)

const roleBlocked = computed(() => {
  const p = pendingRole.value
  const u = p && userById(p.id)
  return !!u && p!.newRole !== 'ADMIN' && store.isLastActiveAdmin(u)
})

async function confirmRoleChange() {
  if (!pendingRole.value) return
  const { id, newRole } = pendingRole.value
  if (await store.updateRole(id, newRole)) {
    toast.success(`Rol cambiado a ${roleLabel[newRole]}`)
    pendingRole.value = null
  } else {
    roleError.value = store.actionError
    toast.error(store.actionError ?? 'No se pudo cambiar el rol')
  }
}

function cancelRoleChange() {
  pendingRole.value = null
  roleError.value = null
}

// ── Status confirm ────────────────────────────────────────
const pendingStatus = ref<{ id: number; current: boolean } | null>(null)

const statusError = ref<string | null>(null)

const statusBlocked = computed(() => {
  const p = pendingStatus.value
  const u = p && userById(p.id)
  return !!u && p!.current && store.isLastActiveAdmin(u)
})

function requestStatusToggle(id: number, current: boolean) {
  statusError.value = null
  pendingStatus.value = { id, current }
}

async function confirmStatusToggle() {
  if (!pendingStatus.value) return
  const { id, current } = pendingStatus.value
  if (await store.toggleStatus(id, !current)) {
    toast.success(current ? 'Usuario desactivado' : 'Usuario activado')
    pendingStatus.value = null
  } else {
    statusError.value = store.actionError
    toast.error(store.actionError ?? 'No se pudo cambiar el estado del usuario')
  }
}

function cancelStatusToggle() {
  pendingStatus.value = null
  statusError.value = null
}

// ── Edit profile modal ────────────────────────────────────
const showEdit    = ref(false)
const editUserId  = ref<number | null>(null)
const editEmail   = ref('')
const editForm    = ref({ firstName: '', lastName: '', phone: '' })
const editLoading = ref(false)
const editSaving  = ref(false)
const editError   = ref<string | null>(null)

async function openEdit(id: number, email: string) {
  editUserId.value = id
  editEmail.value  = email
  editForm.value   = { firstName: '', lastName: '', phone: '' }
  editError.value  = null
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
  editError.value  = null
  try {
    await adminApi.updateUserProfile(editUserId.value, editForm.value)
    toast.success('Perfil actualizado correctamente')
    closeEdit()
  } catch {
    editError.value = 'Error al guardar, intenta de nuevo'
  } finally {
    editSaving.value = false
  }
}

onMounted(() => Promise.all([load(), store.refreshActiveAdminCount()]))
</script>

<template>
  <AdminPage title="Usuarios" :sub="isFiltering ? `${store.users.length} resultados` : `${store.users.length} usuarios registrados`">
    <FilterPills v-model="activeFilter" :options="roleFilters" label="Filtrar por rol" class="mb-3.5" />
    <AdminSearch v-model="search" placeholder="Buscar por nombre o correo..." />

    <AdminStateBox v-if="store.loading">Cargando usuarios...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['ID', 'Nombre', 'Email', 'Rol', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      :empty-text="isFiltering ? 'Ningún usuario coincide con la búsqueda' : 'No hay usuarios registrados'"
    >
      <TableRow v-for="u in filtered" :key="u.id">
        <TableCell class="font-mono text-xs text-muted-foreground">#{{ u.id }}</TableCell>
        <TableCell>{{ u.fullName ?? '—' }}</TableCell>
        <TableCell class="font-semibold text-navy">{{ u.email }}</TableCell>
        <TableCell>
          <NativeSelect
            :model-value="u.role"
            :aria-label="`Rol de ${u.email}`"
            wrapper-class="w-fit"
            class="h-8 w-auto py-1 pr-8 pl-2.5 text-xs font-semibold"
            :class="roleClass[u.role]"
            @update:model-value="requestRoleChange(u.id, u.role, $event as AdminRole)"
          >
            <NativeSelectOption v-for="r in roles" :key="r" :value="r">{{ roleLabel[r] }}</NativeSelectOption>
          </NativeSelect>
        </TableCell>
        <TableCell>
          <button
            type="button"
            class="rounded-full px-3 py-1 text-[11px] font-bold transition-opacity hover:opacity-75 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            :class="u.active ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive'"
            :aria-label="`${u.active ? 'Desactivar' : 'Activar'} a ${u.email}`"
            @click="requestStatusToggle(u.id, u.active)"
          >
            {{ u.active ? 'Activo' : 'Inactivo' }}
          </button>
        </TableCell>
        <TableCell>
          <Button size="sm" variant="outline-primary" @click="openEdit(u.id, u.email)">Editar</Button>
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <ConfirmDialog
      :open="!!pendingRole"
      title="Cambiar rol"
      :loading="store.saving"
      :error="roleError ?? (roleBlocked ? LAST_ADMIN_NOTICE : null)"
      :confirm-disabled="roleBlocked"
      @cancel="cancelRoleChange"
      @confirm="confirmRoleChange"
    >
      <template v-if="pendingRole">
        ¿Cambiar el rol de este usuario de
        <strong>{{ roleLabel[pendingRole.currentRole] }}</strong> a
        <strong>{{ roleLabel[pendingRole.newRole] }}</strong>? Deberá volver a iniciar sesión.
      </template>
    </ConfirmDialog>

    <ConfirmDialog
      :open="!!pendingStatus"
      :title="pendingStatus?.current ? 'Desactivar usuario' : 'Activar usuario'"
      :destructive="pendingStatus?.current"
      :loading="store.saving"
      :error="statusError ?? (statusBlocked ? LAST_ADMIN_NOTICE : null)"
      :confirm-disabled="statusBlocked"
      @cancel="cancelStatusToggle"
      @confirm="confirmStatusToggle"
    >
      ¿{{ pendingStatus?.current ? 'Desactivar' : 'Activar' }} este usuario?
      {{ pendingStatus?.current ? 'Se cerrarán sus sesiones abiertas.' : '' }}
    </ConfirmDialog>

    <Dialog v-model:open="showEdit">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>{{ editEmail }}</DialogDescription>
        </DialogHeader>

        <AdminStateBox v-if="editLoading">Cargando perfil...</AdminStateBox>
        <form v-else class="grid gap-3.5" @submit.prevent="saveProfile">
          <div class="grid gap-3 sm:grid-cols-2">
            <AdminField v-slot="{ id }" label="Nombre">
              <Input :id="id" v-model="editForm.firstName" placeholder="Juan" />
            </AdminField>
            <AdminField v-slot="{ id }" label="Apellido">
              <Input :id="id" v-model="editForm.lastName" placeholder="Pérez" />
            </AdminField>
          </div>
          <AdminField v-slot="{ id }" label="Teléfono">
            <Input :id="id" v-model="editForm.phone" type="tel" placeholder="+51 999 000 111" />
          </AdminField>

          <FormAlert :message="editError" />

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeEdit">Cancelar</Button>
            <Button type="submit" :disabled="editSaving">
              {{ editSaving ? 'Guardando...' : 'Guardar cambios' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </AdminPage>
</template>
