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
      </nav>

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
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s, color 0.2s;
}

.nav-item:hover,
.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
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
