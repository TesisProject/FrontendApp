<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../../../iam/application/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="user-layout">
    <aside class="sidebar">
      <div class="brand">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="10" rx="2" fill="#f2894a"/>
          <path d="M3 11l9-8 9 8" stroke="#092c4c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="brand-name">ParkVision</span>
      </div>

      <nav class="nav">
        <router-link to="/dashboard" class="nav-item" :class="{ 'router-link-active': $route.path === '/dashboard' }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </router-link>

        <router-link to="/dashboard/zones" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/>
            <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
          </svg>
          Zonas
        </router-link>

        <router-link to="/dashboard/favorites" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Favoritos
        </router-link>

        <router-link to="/dashboard/alerts" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Alertas
        </router-link>

        <router-link to="/dashboard/profile" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Perfil
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <span class="user-email">{{ authStore.user?.email }}</span>
        <button class="logout-btn" @click="handleLogout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.user-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
}

.sidebar {
  width: 230px;
  background: #092c4c;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 36px;
  padding: 0 8px;
}

.brand-name {
  font-weight: 700;
  font-size: 18px;
  color: white;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s, color 0.2s;
}

.nav-item:hover,
.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.router-link-active {
  border-left: 3px solid #f2894a;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 8px;
}

.user-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 4px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  transition: color 0.2s;
}

.logout-btn:hover {
  color: white;
}

.content {
  margin-left: 230px;
  flex: 1;
  padding: 32px;
}
</style>
