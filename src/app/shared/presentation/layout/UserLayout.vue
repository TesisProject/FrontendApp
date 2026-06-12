<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../../../iam/application/auth.store'

const router    = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="user-layout">
    <aside class="sidebar" :class="{ collapsed }">

      <div class="sidebar-top">
        <button class="toggle-btn" @click="collapsed = !collapsed" :title="collapsed ? 'Expandir' : 'Contraer'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span v-show="!collapsed" class="brand-name">ParkVision</span>
      </div>

      <nav class="nav">
        <router-link
          to="/dashboard"
          class="nav-item"
          active-class=""
          exact-active-class="nav-item--active"
          :title="collapsed ? 'Dashboard' : ''"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span v-show="!collapsed" class="nav-label">Dashboard</span>
        </router-link>

        <router-link to="/dashboard/zones" class="nav-item" active-class="nav-item--active" exact-active-class="nav-item--active" :title="collapsed ? 'Zonas' : ''">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/>
            <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
          </svg>
          <span v-show="!collapsed" class="nav-label">Zonas</span>
        </router-link>

        <router-link to="/dashboard/favorites" class="nav-item" active-class="nav-item--active" exact-active-class="nav-item--active" :title="collapsed ? 'Favoritos' : ''">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span v-show="!collapsed" class="nav-label">Favoritos</span>
        </router-link>

        <router-link to="/dashboard/alerts" class="nav-item" active-class="nav-item--active" exact-active-class="nav-item--active" :title="collapsed ? 'Alertas' : ''">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-show="!collapsed" class="nav-label">Alertas</span>
        </router-link>

        <router-link to="/dashboard/predictions" class="nav-item" active-class="nav-item--active" exact-active-class="nav-item--active" :title="collapsed ? 'Predicciones' : ''">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span v-show="!collapsed" class="nav-label">Predicciones</span>
        </router-link>

        <router-link to="/dashboard/faq" class="nav-item" active-class="nav-item--active" exact-active-class="nav-item--active" :title="collapsed ? 'FAQ' : ''">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span v-show="!collapsed" class="nav-label">Ayuda</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <span v-show="!collapsed" class="user-email">{{ authStore.user?.email }}</span>
        <router-link to="/dashboard/profile" class="profile-link" active-class="profile-link--active" :title="collapsed ? 'Mi perfil' : ''">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span v-show="!collapsed">Mi perfil</span>
        </router-link>
        <button class="logout-btn" @click="handleLogout" :title="collapsed ? 'Cerrar sesión' : ''">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span v-show="!collapsed">Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <main class="content" :class="{ collapsed }">
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
  padding: 20px 12px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
  padding: 0 4px;
  min-height: 36px;
}

.brand-name {
  font-weight: 700;
  font-size: 17px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
}

.toggle-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 6px;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.toggle-btn:hover {
  background: rgba(255,255,255,0.15);
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
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.nav-item--active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-left: 3px solid #f2894a;
}

.collapsed .nav-item {
  justify-content: center;
  padding: 10px;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 4px;
}

.user-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 8px;
}

.profile-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 14px;
  white-space: nowrap;
  border-top: 1px solid rgba(255,255,255,0.08);
  transition: background 0.2s, color 0.2s;
}

.profile-link:hover,
.profile-link--active {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.collapsed .profile-link {
  justify-content: center;
  padding: 10px;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  width: 100%;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.08);
  color: white;
}

.collapsed .logout-btn {
  justify-content: center;
  padding: 10px;
}

.content {
  margin-left: 230px;
  flex: 1;
  padding: 32px;
  transition: margin-left 0.25s ease;
  background: var(--color-bg);
  color: var(--color-text);
}

.content.collapsed {
  margin-left: 64px;
}
</style>
