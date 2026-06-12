<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../../iam/application/auth.store'
import { adminApi } from '../../infrastructure/admin-api'
import { httpClient } from '../../../shared/infrastructure/http-client'

const authStore = useAuthStore()
const userId    = computed(() => authStore.user?.id ?? 0)
const email     = computed(() => authStore.user?.email ?? '')

// Profile section
const profileForm    = ref({ firstName: '', lastName: '', phone: '' })
const profileLoading = ref(false)
const profileSaving  = ref(false)
const profileMsg     = ref<{ ok: boolean; text: string } | null>(null)

// Password section
const passForm   = ref({ currentPassword: '', newPassword: '', confirm: '' })
const passSaving = ref(false)
const passMsg    = ref<{ ok: boolean; text: string } | null>(null)

async function loadProfile() {
  if (!userId.value) return
  profileLoading.value = true
  try {
    const p = await adminApi.getUserProfile(userId.value)
    profileForm.value = {
      firstName: p.firstName ?? '',
      lastName:  p.lastName  ?? '',
      phone:     p.phone     ?? '',
    }
  } finally {
    profileLoading.value = false
  }
}

async function saveProfile() {
  profileSaving.value = true
  profileMsg.value    = null
  try {
    await adminApi.updateUserProfile(userId.value, profileForm.value)
    profileMsg.value = { ok: true, text: 'Perfil actualizado correctamente' }
  } catch {
    profileMsg.value = { ok: false, text: 'Error al guardar, intenta de nuevo' }
  } finally {
    profileSaving.value = false
  }
}

async function savePassword() {
  if (!passForm.value.currentPassword) {
    passMsg.value = { ok: false, text: 'Ingresa tu contraseña actual' }
    return
  }
  if (passForm.value.newPassword.length < 8) {
    passMsg.value = { ok: false, text: 'La nueva contraseña debe tener al menos 8 caracteres' }
    return
  }
  if (passForm.value.newPassword !== passForm.value.confirm) {
    passMsg.value = { ok: false, text: 'Las contraseñas no coinciden' }
    return
  }
  passSaving.value = true
  passMsg.value    = null
  try {
    await httpClient.put(`/iam/users/${userId.value}/password`, {
      currentPassword: passForm.value.currentPassword,
      newPassword:     passForm.value.newPassword,
    })
    passMsg.value  = { ok: true, text: 'Contraseña actualizada correctamente' }
    passForm.value = { currentPassword: '', newPassword: '', confirm: '' }
  } catch (err: any) {
    const code = err?.error ?? ''
    passMsg.value = {
      ok: false,
      text: code === 'INVALID_PASSWORD' ? 'La contraseña actual es incorrecta' : 'Error al actualizar contraseña',
    }
  } finally {
    passSaving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Mi perfil</h1>
        <p class="page-sub">{{ email }}</p>
      </div>
    </div>

    <div class="profile-grid">
      <!-- Info personal -->
      <div class="profile-card">
        <div class="card-header">
          <div class="card-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h2 class="card-title">Información personal</h2>
        </div>

        <div v-if="profileLoading" class="loading-text">Cargando perfil...</div>

        <template v-else>
          <div class="form-row">
            <div class="form-group">
              <label>Nombre</label>
              <input v-model="profileForm.firstName" type="text" placeholder="Juan" />
            </div>
            <div class="form-group">
              <label>Apellido</label>
              <input v-model="profileForm.lastName" type="text" placeholder="Pérez" />
            </div>
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input v-model="profileForm.phone" type="text" placeholder="+51 999 000 111" />
          </div>
          <div class="form-group">
            <label>Correo electrónico</label>
            <input :value="email" type="email" disabled class="input-disabled" />
          </div>

          <p v-if="profileMsg" class="feedback" :class="profileMsg.ok ? 'ok' : 'err'">
            {{ profileMsg.text }}
          </p>

          <div class="card-actions">
            <button class="btn-primary" :disabled="profileSaving" @click="saveProfile">
              {{ profileSaving ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </template>
      </div>

      <!-- Cambiar contraseña -->
      <div class="profile-card">
        <div class="card-header">
          <div class="card-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 class="card-title">Cambiar contraseña</h2>
        </div>

        <div class="form-group">
          <label>Contraseña actual</label>
          <input v-model="passForm.currentPassword" type="password" placeholder="Tu contraseña actual" autocomplete="current-password" />
        </div>
        <div class="form-group">
          <label>Nueva contraseña</label>
          <input v-model="passForm.newPassword" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label>Confirmar contraseña</label>
          <input v-model="passForm.confirm" type="password" placeholder="Repite la contraseña" autocomplete="new-password" />
        </div>

        <p v-if="passMsg" class="feedback" :class="passMsg.ok ? 'ok' : 'err'">
          {{ passMsg.text }}
        </p>

        <div class="card-actions">
          <button class="btn-primary" :disabled="passSaving || !passForm.currentPassword || !passForm.newPassword || !passForm.confirm" @click="savePassword">
            {{ passSaving ? 'Guardando...' : 'Actualizar contraseña' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Admin badge -->
    <div class="admin-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Cuenta con rol Administrador
    </div>
  </div>
</template>

<style scoped>
@import '../styles/admin-shared.css';

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 700px) {
  .profile-grid { grid-template-columns: 1fr; }
}

.profile-card {
  background: white;
  border-radius: 14px;
  border: 1px solid #e8e8e8;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f0f4f8;
  color: #092c4c;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #092c4c;
  margin: 0;
}

.loading-text { font-size: 13px; color: #aaa; }

.input-disabled {
  background: #f8f8f8;
  color: #aaa;
  cursor: not-allowed;
}

.card-actions { display: flex; justify-content: flex-end; margin-top: 4px; }

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ebf8ff;
  color: #2b6cb0;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
}
</style>
