<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../../../iam/application/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/admin')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-name">ParkVision</span>
        <span class="brand-tag">Admin</span>
      </div>

      <nav class="nav">
        <router-link to="/admin/dashboard" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </router-link>

        <router-link to="/admin/zones" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/>
            <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
          </svg>
          Zonas
        </router-link>

        <router-link to="/admin/cameras" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          Cámaras
        </router-link>

        <router-link to="/admin/nodes" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          Nodos
        </router-link>

        <router-link to="/admin/api-keys" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          API Keys
        </router-link>

        <router-link to="/admin/alerts" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Alertas
        </router-link>

        <router-link to="/admin/users" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Usuarios
        </router-link>
      </nav>

      <router-link to="/admin/profile" class="nav-item profile-link">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Mi perfil
      </router-link>

      <button class="logout-btn" @click="handleLogout">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Cerrar sesión
      </button>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
}

.sidebar {
  width: 220px;
  background: #092c4c;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 36px;
  padding: 0 8px;
}

.brand-name {
  font-weight: 700;
  font-size: 18px;
  color: white;
}

.brand-tag {
  font-size: 10px;
  font-weight: 600;
  background: #f2894a;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  transition: background 0.15s ease-out, color 0.15s ease-out;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

/* Sección activa: fondo + barra indicadora naranja */
.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.12);
  color: white;
  font-weight: 600;
}
.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #f2894a;
}

.nav-item:focus-visible,
.logout-btn:focus-visible {
  outline: 2px solid #f2894a;
  outline-offset: 2px;
}

.profile-link {
  margin-top: auto;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 12px;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s, color 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.content {
  margin-left: 220px;
  flex: 1;
  padding: 32px;
}
</style>
