<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore }    from '../../../iam/application/auth.store'
import { useProfileStore } from '../../application/profile.store'
import { useThemeStore }   from '../../../shared/application/theme.store'

const authStore    = useAuthStore()
const profileStore = useProfileStore()
const themeStore   = useThemeStore()

const activeTab  = ref<'info' | 'preferences'>('info')
const savedOk    = ref(false)

const userId = computed(() => authStore.user?.id ?? 0)

const form = ref({
  firstName: '',
  lastName:  '',
  phone:     '',
  avatarUrl: '',
  bio:       '',
})

const prefs = ref({
  darkMode:           false,
  language:           'es',
  alertFreeSpace:     true,
  alertSaturated:     true,
  alertCameraFailure: true,
  alertRadiusM:       500,
})

const initials = computed(() => {
  const p = profileStore.profile
  if (p?.firstName && p?.lastName) return (p.firstName[0] + p.lastName[0]).toUpperCase()
  return authStore.user?.email?.[0]?.toUpperCase() ?? '?'
})

const fullName = computed(() => {
  const p = profileStore.profile
  if (p?.firstName || p?.lastName) return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim()
  return authStore.user?.email ?? ''
})

const roleBadge: Record<string, string> = {
  ADMIN:    'Administrador',
  OPERATOR: 'Operador',
  USER:     'Usuario',
}

watch(() => prefs.value.darkMode, (val) => themeStore.setDark(val))

async function handleSaveProfile() {
  savedOk.value = false
  const ok = await profileStore.updateProfile(userId.value, { ...form.value })
  if (ok) {
    savedOk.value = true
    setTimeout(() => { savedOk.value = false }, 3000)
  }
}

async function handleSavePreferences() {
  savedOk.value = false
  const ok = await profileStore.updatePreferences(userId.value, { ...prefs.value })
  if (ok) {
    savedOk.value = true
    setTimeout(() => { savedOk.value = false }, 3000)
  }
}

onMounted(async () => {
  await profileStore.fetchProfile(userId.value)
  const p = profileStore.profile
  if (p) {
    form.value = {
      firstName: p.firstName,
      lastName:  p.lastName,
      phone:     p.phone,
      avatarUrl: p.avatarUrl,
      bio:       p.bio,
    }
  }

  await profileStore.fetchPreferences(userId.value)
  const pr = profileStore.preferences
  if (pr) {
    prefs.value = {
      darkMode:           themeStore.isDark,  // usa el estado activo real, no el del backend
      language:           pr.language,
      alertFreeSpace:     pr.alertFreeSpace,
      alertSaturated:     pr.alertSaturated,
      alertCameraFailure: pr.alertCameraFailure,
      alertRadiusM:       pr.alertRadiusM,
    }
  }
})
</script>

<template>
  <div class="profile-page">

    <!-- Header card -->
    <div class="profile-header-card">
      <div class="avatar">
        <img v-if="profileStore.profile?.avatarUrl" :src="profileStore.profile.avatarUrl" :alt="fullName" class="avatar-img" />
        <span v-else class="avatar-initials">{{ initials }}</span>
      </div>
      <div class="header-info">
        <h2 class="profile-name">{{ fullName }}</h2>
        <span class="profile-email">{{ authStore.user?.email }}</span>
        <span class="role-badge">{{ roleBadge[authStore.user?.role ?? ''] ?? authStore.user?.role }}</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">
        Información personal
      </button>
      <button class="tab" :class="{ active: activeTab === 'preferences' }" @click="activeTab = 'preferences'">
        Preferencias
      </button>
    </div>

    <!-- Loading -->
    <div v-if="profileStore.profileLoading || profileStore.prefsLoading" class="center-state">
      <span class="state-text">Cargando...</span>
    </div>

    <!-- Error -->
    <div v-else-if="profileStore.profileError || profileStore.prefsError" class="center-state">
      <span class="state-text error">{{ profileStore.profileError || profileStore.prefsError }}</span>
    </div>

    <template v-else>

      <!-- Tab: Información personal -->
      <div v-if="activeTab === 'info'" class="card">
        <h3 class="section-title">Información personal</h3>

        <div class="form-row">
          <div class="form-group">
            <label>Nombre</label>
            <input v-model="form.firstName" type="text" placeholder="Tu nombre" maxlength="100" />
          </div>
          <div class="form-group">
            <label>Apellido</label>
            <input v-model="form.lastName" type="text" placeholder="Tu apellido" maxlength="100" />
          </div>
        </div>

        <div class="form-group">
          <label>Teléfono</label>
          <input v-model="form.phone" type="tel" placeholder="+51 999 999 999" maxlength="20" />
        </div>

        <div class="form-group">
          <label>URL de foto de perfil</label>
          <input v-model="form.avatarUrl" type="url" placeholder="https://..." maxlength="500" />
        </div>

        <div class="form-group">
          <label>Biografía</label>
          <textarea v-model="form.bio" placeholder="Cuéntanos algo sobre ti..." rows="3" />
        </div>

        <div class="form-actions">
          <span v-if="savedOk" class="success-msg">Cambios guardados</span>
          <span v-if="profileStore.saveError" class="error-msg">{{ profileStore.saveError }}</span>
          <button class="save-btn" :disabled="profileStore.saving" @click="handleSaveProfile">
            {{ profileStore.saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>

      <!-- Tab: Preferencias -->
      <div v-if="activeTab === 'preferences'" class="card">
        <h3 class="section-title">Preferencias</h3>

        <div class="pref-toggle">
          <div class="pref-label">
            <span>Modo oscuro</span>
            <span class="pref-desc">Cambia la apariencia de la aplicación</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="prefs.darkMode" />
            <span class="slider" />
          </label>
        </div>

        <div class="section-subtitle">Alertas</div>

        <div class="pref-toggle">
          <div class="pref-label">
            <span>Espacio libre disponible</span>
            <span class="pref-desc">Notificar cuando haya espacios libres cerca</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="prefs.alertFreeSpace" />
            <span class="slider" />
          </label>
        </div>

        <div class="pref-toggle">
          <div class="pref-label">
            <span>Zona saturada</span>
            <span class="pref-desc">Notificar cuando una zona supere el 70% de ocupación</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="prefs.alertSaturated" />
            <span class="slider" />
          </label>
        </div>

        <div class="pref-toggle">
          <div class="pref-label">
            <span>Fallo de cámara</span>
            <span class="pref-desc">Notificar cuando una cámara quede fuera de línea</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="prefs.alertCameraFailure" />
            <span class="slider" />
          </label>
        </div>

        <div class="form-group mt-16">
          <label>Radio de alertas</label>
          <div class="radius-row">
            <input v-model.number="prefs.alertRadiusM" type="number" min="0" step="50" class="radius-input" />
            <span class="radius-unit">metros</span>
          </div>
        </div>

        <div class="form-actions">
          <span v-if="savedOk" class="success-msg">Preferencias guardadas</span>
          <span v-if="profileStore.saveError" class="error-msg">{{ profileStore.saveError }}</span>
          <button class="save-btn" :disabled="profileStore.saving" @click="handleSavePreferences">
            {{ profileStore.saving ? 'Guardando...' : 'Guardar preferencias' }}
          </button>
        </div>
      </div>

    </template>

  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}

/* Header card */
.profile-header-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--color-card);
  border-radius: 14px;
  border: 1px solid var(--color-border);
  padding: 24px;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #092c4c;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 26px;
  font-weight: 700;
  color: white;
  letter-spacing: 1px;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-title);
  margin: 0;
}

.profile-email {
  font-size: 13px;
  color: var(--color-muted);
}

.role-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: #f2894a18;
  color: #f2894a;
  width: fit-content;
  margin-top: 2px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  background: var(--color-border-soft);
  padding: 4px;
  border-radius: 10px;
  width: fit-content;
}

.tab {
  padding: 7px 18px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: var(--color-card);
  color: var(--color-title);
  box-shadow: var(--shadow-card);
}

/* Card */
.card {
  background: var(--color-card);
  border-radius: 14px;
  border: 1px solid var(--color-border);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-title);
  margin: 0 0 4px;
}

.section-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-sub);
  padding-top: 4px;
  border-top: 1px solid #f0f0f0;
  margin-top: 4px;
}

/* Form */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.mt-16 { margin-top: 4px; }

label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-sub);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

input[type="text"],
input[type="tel"],
input[type="url"],
input[type="number"],
select,
textarea {
  padding: 9px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-input-bg);
  transition: border-color 0.2s;
  outline: none;
  font-family: inherit;
  resize: none;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--color-title);
}

/* Radius row */
.radius-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.radius-input {
  width: 110px;
}

.radius-unit {
  font-size: 13px;
  color: var(--color-muted);
}

/* Toggle switch */
.pref-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-soft);
}

.pref-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pref-label span:first-child {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.pref-desc {
  font-size: 12px;
  color: var(--color-faint);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle input { display: none; }

.slider {
  position: absolute;
  inset: 0;
  background: var(--color-toggle-off);
  border-radius: 22px;
  transition: background 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}

.toggle input:checked + .slider { background: #f2894a; }
.toggle input:checked + .slider::before { transform: translateX(18px); }

/* Actions */
.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-soft);
  margin-top: 4px;
}

.save-btn {
  padding: 9px 24px;
  background: #092c4c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.save-btn:hover    { background: #0b3a64; }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.success-msg {
  font-size: 13px;
  color: #38a169;
  font-weight: 500;
}

.error-msg {
  font-size: 13px;
  color: #e53e3e;
}

/* Center state */
.center-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.state-text { font-size: 14px; color: var(--color-faint); }
</style>
